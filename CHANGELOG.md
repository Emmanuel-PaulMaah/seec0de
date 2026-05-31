# Changelog

All notable changes to **seec0de** are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Section conventions:
- **Added** — new features.
- **Changed** — changes to existing behaviour.
- **Fixed** — bug fixes.
- **Removed** — features taken out.
- **Deprecated** — features still present but slated for removal.
- **Security** — vulnerability fixes.

---

## [Unreleased]

---

## [3.4.0] - 2026-05-31

### Changed
- **Manual Generate button now always calls AI for novel prompts.** Previously `handleGenerate` in [`App.jsx`](src/renderer/App.jsx) regex-matched the typed instruction against built-in templates via `matchesTemplate(text)` and, on any match, silently short-circuited to the offline `generateCode()` — so typing *"fizzbuzz from 1 to 20"* in the textbox and clicking Generate would dump the canned FizzBuzz template instead of asking Gemini, making the AI button look like it was ignoring novel input. The template short-circuit is now gated on a `{ source: 'suggestion' }` marker that [`InstructionPanel.jsx`](src/renderer/components/InstructionPanel.jsx) sets only when the user clicks a *"Try one of these"* suggestion chip. Manual Generate clicks always route to AI (key present + online → call Gemini; otherwise surface the existing *"add a Gemini key"* / *"you're offline"* error card). Suggestion chips still serve the hand-tuned template output unchanged — they're explicitly designed to map onto a template's regex, and the canonical lesson is the point.
- **Gemini request layer hardened** in [`src/main/aiService.js`](src/main/aiService.js). Each round-trip now: pre-serialises the body + sets explicit `Content-Length` / `Accept` / `User-Agent` headers (avoids chunked-encoding rejections from intercepting AVs and corporate proxies); enforces a 60s hard timeout via `req.setTimeout` + `req.destroy` so wedged sockets fail fast instead of hanging; on any network-level failure (`ENOTFOUND`, `ECONNRESET`, `ETIMEDOUT`, `EPROTO`, *"socket hang up"*) retries the SAME model with `family: 4` forced — cures the broken-IPv6-on-Windows class of errors where DNS returns AAAA records the network can't actually route; promotes network failures to fallback-eligible across the model list (was: only `429`/`503`/overload triggered model fallback); translates raw Node socket errors into actionable messages via a new `classifyNetworkError()` helper (e.g. `ECONNRESET` becomes *"Connection to Gemini was reset. This usually means an antivirus, firewall, or corporate proxy is intercepting HTTPS traffic — try whitelisting seec0de or temporarily disabling HTTPS scanning."*) that `describeAiError` in `App.jsx` already routes through the inline error card.
- **Suppressed cosmetic Chromium GPU shader disk-cache errors** on Windows (`cache_util_win.cc(20): Unable to move the cache: Access is denied. (0x5)` / `gpu_disk_cache.cc(676): Gpu Cache Creation failed: -2`). Added `app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')` in [`src/main/main.js`](src/main/main.js) before app-ready. The errors were harmless Chromium noise from trying to relocate the `%AppData%\seec0de\GPUCache\` directory, but they polluted the dev console and made AI failures look like they originated in the GPU layer.

### Added
- **Resilient encrypted API key storage with fallback path.** [`src/main/aiService.js`](src/main/aiService.js) tries the primary `<userData>/gemini.key` first; on `EACCES` / `EPERM` (typically Windows AV / policy / locked `%AppData%\seec0de\` directory) it falls back to `~/.seec0de/gemini.key`, auto-creating the directory. Boot-time load checks both paths. The `ai:set-key` IPC now returns `{ ok, path?, sessionOnly?, error? }` so the renderer can surface a real warning when persistence fails instead of the previous always-`{ ok: true }` lie that silently kept the key in-memory until next launch. Implements Strategy #3 from [`docs/SECURE_KEY_STORAGE.md`](docs/SECURE_KEY_STORAGE.md).

### Fixed
- **AI explanation accordion headers showed bare line numbers instead of the code** in [`ExplanationSidebar.jsx`](src/renderer/components/ExplanationSidebar.jsx). The AI prompt in [`src/renderer/engine/aiService.js`](src/renderer/engine/aiService.js) asks Gemini for `{ line: <number>, code: "<actual line>", explanation }`, but the offline explainer ships `{ line: "<actual line>", explanation }` — and the sidebar's accordion header reads `item.line`, so AI responses rendered as bare numbers (`1`, `2`, `3`, …) where template responses showed the actual code. `explainCodeWithAI` now normalises the AI's per-line shape to the offline shape (preferring `item.code`, falling back to `item.line` if it's already a string) so both sources feed the sidebar identically without touching the component.
- **Gemini API schema bug**: `system_instruction.parts` was being sent as an object (`{ text: ... }`) but Gemini's schema requires `parts` to be an array of `Part` objects. Some Gemini endpoints silently accepted the wrong shape, others rejected it — now correctly `[ { text: ... } ]`.
- **Error-message placeholder rendered `(undefined)`** when Gemini returned a non-2xx response with no parseable error body. `tryModel` in [`src/main/aiService.js`](src/main/aiService.js) referenced `res.status` on a Node `http.IncomingMessage`, which doesn't exist — the field is `res.statusCode`. Fixed in both fallback branches.

---

## [3.3.1] - 2026-05-29

### Fixed
- **Generate button looked broken for novel prompts.** When the learner typed an instruction that wasn't covered by a built-in template (anything beyond the suggestion chips: "sort", "fizzbuzz", "palindrome", etc.) and the AI call failed or no key was set, [`App.jsx`](src/renderer/App.jsx) silently fell back to the offline `generateCode()` which only had the generic `PROGRAM CustomTask` / *"Task completed"* scaffold to offer — indistinguishable from "nothing happened" from the user's POV. Failures (invalid key, 429/503 overload, network drop, parse error) were also swallowed into a `console.warn` the user could never see. `handleGenerate` now captures the real error into a new `aiError` state and surfaces it in the Instruction panel as a small inline card with the actual reason in plain English; when the failure looks key-related (`"API key not valid"`, `"permission denied"`, no key at all) the card shows an **Open Settings** button that pops the drawer straight to the AI section. Novel prompts with no key / offline produce a clear *"add a Gemini key"* / *"you're offline"* prompt instead of silently emitting the generic placeholder.
- **`hasApiKey()` hydration race could skip AI even with a saved key.** The renderer-side cache hydrates asynchronously on module load (encrypted key read from main process). A fast Generate click immediately after launch could read `false` and route to the offline path. `handleGenerate` now re-verifies via `refreshHasApiKey()` whenever the synchronous cache says "no", closing the window where a real key gets treated as missing.
- **InstructionPanel's "Add a Gemini key" hint was stale.** The panel called `hasApiKey()` once at render and never subscribed to changes, so the hint stayed visible after the user saved a key in Settings until something else caused a re-render. Now subscribes via `subscribeHasApiKey` so the hint disappears the instant a key lands. Same wiring drives the new error card's `kind` decision.
- **Stale error card after editing the prompt.** Surfaced errors clear automatically the moment the learner edits the instruction textarea, so a red banner doesn't linger over a prompt they've already moved on from.

### Changed
- **`generateCodeWithAI` failures no longer fall through to the offline generator for novel prompts.** The offline path can only produce the generic `PROGRAM CustomTask` scaffold for anything that doesn't match a template's regex, and silently substituting that for a real AI answer is what made the button feel broken. Template-matching prompts (suggestion chips and direct hits like "sort numbers", "fizzbuzz from 1 to 20") still use the offline path unchanged — they don't need AI and the hand-tuned output is canonical.

---

## [3.2.0] - 2026-05-26

### Added
- **Encrypted API key storage.** The Gemini key is no longer kept in `localStorage` (plain text, readable by any renderer-side bug). It now lives in the main process at `<userData>/gemini.key`, encrypted with Electron's [`safeStorage`](https://www.electronjs.org/docs/latest/api/safe-storage) (DPAPI on Windows, Keychain on macOS, libsecret on Linux). When the OS keystore is unavailable, `safeStorage` falls back to a base64 obfuscation so writes never silently fail. New IPC bridge `window.seecode.ai.{setKey, hasKey, call}` exposed from [`preload.js`](src/main/preload.js); the actual Gemini HTTPS call moved off the renderer and into [`src/main/aiService.js`](src/main/aiService.js) so the renderer never touches the network directly.
- **Sandboxed child-process environment.** New [`src/main/envUtils.js`](src/main/envUtils.js) exposes `getSafeEnv()`, a whitelist of safe variables (`PATH`, `HOME`/`USERPROFILE`, locale, temp dirs) plus seec0de-specific overrides (`NO_COLOR=1`, `FORCE_COLOR=0`, `NODE_DISABLE_COLORS=1`). Both [`runnerService.js`](src/main/runnerService.js) and [`terminalService.js`](src/main/terminalService.js) spawn children with this env instead of `process.env`, so secrets that happen to be in the parent process (CI tokens, GH_TOKEN during a release build, etc.) don't leak into user code or shell commands.
- **Filesystem IPC path-validation.** [`fileService.js`](src/main/fileService.js) gained a `validatePath()` guard that restricts every `fs:*` IPC call to either the open project root or the OS temp dir. Permissive when no root is set yet (boot before the renderer's `setProjectRoot` IPC lands) so legitimate startup reads aren't rejected. New `window.seecode.fs.setProjectRoot()` bridge keeps the main process in sync with the renderer's `rootPath` state.
- **Runner / terminal IPC input validation.** `runner:run` rejects unknown languages at the boundary; `term:exec` rejects non-string commands. Cheap defence against malformed IPC payloads.
- **Lessons panel** in the Instruction column. The panel now has a `Build` / `Lessons` tab strip — *Build* keeps the existing instruction textarea + suggestion chips, *Lessons* opens a curated track of starter exercises (see new [`src/renderer/data/lessons.json`](src/renderer/data/lessons.json) + [`LessonsPanel.jsx`](src/renderer/components/LessonsPanel.jsx)). Selecting a lesson fills the instruction, shows the goal + exercise in an active-lesson card, and marks the lesson complete on the first successful Run. Completion state persists via a new `completedLessons[]` settings field (schema v1 → v2 additive migration).
- **AI fallback for unrecognised runtime errors.** The offline regex translator in [`errorTranslator.js`](src/renderer/engine/errorTranslator.js) only covers errors a beginner hits in their first 50 hours per language. When a failed run produces stderr the offline translator can't match AND the user has a Gemini API key + connection, [`LivePreviewPanel.jsx`](src/renderer/components/LivePreviewPanel.jsx) calls the new `explainErrorWithAI(stderr, code, language)` in [`aiService.js`](src/renderer/engine/aiService.js). The AI returns the same `{title, plain, fixes}` shape an offline card uses, so it renders through the existing `ErrorTranslatorCard` component with a small "AI" badge. A skeleton card appears while the call is in flight; a monotonic `runIdRef` guard discards stale responses if the learner re-runs or switches files before the AI reply lands. Failures are silent — the raw stderr is always visible regardless.
- **Template-aware Generate short-circuit.** `matchesTemplate(instruction)` exported from [`codeGenerator.js`](src/renderer/engine/codeGenerator.js); [`App.jsx`](src/renderer/App.jsx) uses it to skip the network round-trip when the prompt matches a built-in template (typically a suggestion chip). The hand-tuned offline output is the canonical lesson for those prompts — paying for a slower, less consistent AI answer added latency without value.
- **Editor font-size controls** in [`CodePanel.jsx`](src/renderer/components/CodePanel.jsx). `A−` / size / `A+` buttons in the editor toolbar, plus `Ctrl/⌘ +` / `Ctrl/⌘ −` / `Ctrl/⌘ 0` shortcuts. Clamped to 10–28 px, persisted per-install under `seec0de.editorFontSize`.
- **AI explain loading state** in [`ExplanationSidebar.jsx`](src/renderer/components/ExplanationSidebar.jsx). Selecting code and hitting Explain now shows a "Thinking…" block in the sidebar while the AI call is in flight, so the spinner is visible even when the user has the sidebar collapsed.

### Changed
- **`hasApiKey()` stays synchronous** in the renderer. Even though the source of truth moved to the main process, the renderer-side `aiService.js` caches the boolean and hydrates it via IPC on module load and after every save. Callers (App.jsx, InstructionPanel, LivePreviewPanel) keep their existing render-time branches unchanged.
- **Generate flow refactored** in [`App.jsx`](src/renderer/App.jsx): writes runner output with `language` attached so the Console panel can route stderr to the language-appropriate error translator.
- **Console panel layout** in [`LivePreviewPanel.jsx`](src/renderer/components/LivePreviewPanel.jsx): translation cards stack above the raw stderr instead of replacing it. Each card is independently dismissible per-run.

### Fixed
- **ANSI color escape codes no longer leak into the Console panel** when running JavaScript (and other languages). Node's `console.log` calls `util.inspect` with colors enabled whenever `FORCE_COLOR` is set in the parent environment, which produced output like `␛[33m3␛[39m` and `[ ␛[32m'Milk'␛[39m, … ]` instead of clean `3` / `[ 'Milk', … ]`. [`runnerService.js`](src/main/runnerService.js) now passes `NO_COLOR=1`, `FORCE_COLOR=0`, `NODE_DISABLE_COLORS=1`, and `TERM=dumb` into every spawned child via `getSafeEnv()` so Node — and Python's colorama, gcc/clang diagnostics, etc. — emit plain text the `<pre>`-based console can render correctly.
- **"API key not valid" after clicking Save without retyping.** The Settings drawer pre-fills the input with `••••••••••••••••` when a key already exists. The first version of the save handler would overwrite the real encrypted key with those bullet characters on the next click, and every subsequent Gemini call would fail with *"API key not valid. Please pass a valid API key."* The handler now treats an unchanged mask as a no-op confirm, and focusing the field clears the mask so a fresh key can be typed without first manually deleting the bullets.
- **Legacy API key migration.** Users upgrading from v3.1.x had their plaintext key in `localStorage` under `seec0de_gemini_key`; the security restructure moved the source of truth to the encrypted main-process store but didn't migrate. On first boot of v3.2.0, the renderer's `aiService.js` reads the legacy key, persists it through the new encrypted bridge, then wipes the `localStorage` copy. Best-effort and never blocks app boot.
- **`getSafeEnv` import** was missing from [`runnerService.js`](src/main/runnerService.js) and [`terminalService.js`](src/main/terminalService.js) → every Run and every terminal command crashed with `ReferenceError: getSafeEnv is not defined`. Both files now `require('./envUtils')`.
- **`hasApiKey()` returned a Promise** from the IPC bridge but every renderer call site used it as a boolean during render — a Promise is truthy, so the AI path was taken even when no key was set, producing failed network calls that fell back to offline templates with log noise. Restored as a synchronous cached boolean (`refreshHasApiKey()` re-hydrates from main).
- **`validatePath()` "Security violation" on boot** when a folder was restored from `localStorage` — the renderer's `setProjectRoot` IPC was async and could race the FileExplorer's first reads. Validation is now permissive when no root is set yet.
- **Monaco web workers crashed → editor ran in main thread, causing UI freezes.** A direct `import * as monaco from 'monaco-editor'` + `loader.config({ monaco })` was added without configuring `MonacoEnvironment.getWorkerUrl`. Reverted to the original `@monaco-editor/react` CDN loading path; bundle size dropped from 3.75 MB back to 531 KB.
- **Over-restrictive `<meta http-equiv="Content-Security-Policy">`** in [`index.html`](src/renderer/index.html) blocked `ws://localhost:9000` (webpack-dev-server HMR) and the Monaco CDN. Removed — this is an Electron desktop app where the renderer is trusted code shipped via signed installer; CSP-via-meta provides no additional defence beyond Electron's context isolation.

### Security
- **API key is no longer plain-text in `localStorage`.** Encrypted at rest via `safeStorage` and isolated to the main process. A one-time migration moves existing keys over and wipes the plaintext copy.
- **Child-process env is whitelisted.** Parent-process secrets can't leak into spawned user code or shell commands.
- **FS IPC is restricted** to the open project root + OS temp dir when a root is set.

## [3.1.1] - 2026-05-22

> Re-ship of the intended v3.1.0 release. The v3.1.0 build/publish failed before the GitHub release artifacts were finalised, so the version was bumped to v3.1.1 and re-shipped. No code differences vs. the intended v3.1.0 — same feature set listed below. The v3.1.0 GitHub release and tag have been removed.

### Added
- **Hand-written offline summaries for every built-in template.** New [`src/renderer/engine/templateSummaries.js`](src/renderer/engine/templateSummaries.js) ships 117 AI-quality, context-aware summaries (14 templates × 8–9 languages) keyed by `[templateName][language]`. When the learner clicks Explain on code that came verbatim from a generator template, the offline explainer opens with a one-sentence summary that names actual functions, variables, literals, and language idioms — e.g. *"Sorts `[64, 34, 25, 12, 22, 11, 90]` in place with adjacent-pair comparisons and a destructuring swap, breaking early via the `swapped` flag"* — instead of *"This code uses loops, contains function definitions."* Falls back to the heuristic summary the moment the learner edits the code.
- **`findTemplateMatch(code)` export in [`codeGenerator.js`](src/renderer/engine/codeGenerator.js).** Iterates every template's per-language code and returns `{ templateName, language }` on an exact byte-match (after trimming trailing whitespace). Drives the new template-aware summary lookup in the offline explainer.

### Changed
- **UI surfaces are now pure black, matching VS Code's *Dark High Contrast* (`hc-black`).** All `--bg-*` tokens in [`global.css`](src/renderer/styles/global.css) (primary/secondary/tertiary/elevated/input) collapsed to `#000000`; borders bumped to `#2b2b2b` / `#3f3f3f` so panels stay distinguishable against the darker chrome; `--border-focus` switched to VS Code's `hc-black` contrast-border cyan (`#6fc3df`). Scrollbar track also pure black. Hard-coded `#151515` background in [`KeywordTooltip.jsx`](src/renderer/components/KeywordTooltip.jsx) matched to `#000000`.
- **Monaco editor switched to the built-in `hc-black` theme** in [`CodePanel.jsx`](src/renderer/components/CodePanel.jsx) (was `vs-dark`). The code editor canvas, gutters, and syntax highlighting now match VS Code's *Dark High Contrast* exactly.
- **Offline explainer line-by-line heuristic upgraded** in [`codeExplainer.js`](src/renderer/engine/codeExplainer.js) to surface real names/values instead of generic textbook definitions:
  - Imports name the actual target (*"Imports `math` so its functions/types are available below"*).
  - Class definitions detect inheritance (*"Defines class `Dog` that inherits from `Animal`"*).
  - Function definitions list real parameters (*"Defines function `bubble_sort` that takes one parameter (`arr`)"*).
  - Variable assignments include the literal RHS when short (*"Stores `[5, 3, 8, 1, 9, 2, 7, 4, 6]` in `numbers`"*) and flag `mut` for Rust.
  - Print statements surface the actual argument (*"Prints `"Hello, World!"` to the console"*), handling both `()` calls and C++-style `<<`.

## [3.0.0] - 2026-05-20

### Changed
- **Single Generate button** in the Instruction panel ([`InstructionPanel.jsx`](src/renderer/components/InstructionPanel.jsx)) — was: Generate + AI Generate. The unified button auto-routes in [`App.jsx`](src/renderer/App.jsx): when a Gemini API key is present *and* `navigator.onLine === true`, it calls the AI; on any AI failure (network drop mid-call, quota, parse error) or when no key/offline, it silently falls back to the built-in offline template generator. The learner always gets *something*, the UI no longer asks them to pick a path.
- **Single Explain button** in the Code panel ([`CodePanel.jsx`](src/renderer/components/CodePanel.jsx)) — was: Explain + AI Explain. The floating button that appears on text selection now applies the same auto-fallback (AI first when available, offline glossary explainer as the safety net). Shows a "Thinking…" spinner during AI calls.
- **Console tab is now Run-driven only** ([`LivePreviewPanel.jsx`](src/renderer/components/LivePreviewPanel.jsx)). The iframe-side `console.*` capture (the `CONSOLE_CAPTURE` IIFE + parent `postMessage` listener) has been removed. Typing into the editor no longer produces Console entries. Run — invoked from the editor toolbar in `CodePanel` — is the single, explicit gesture that produces console output. Same mental model that already applied to Python/C/C++ now applies uniformly.
- **JavaScript Preview tab no longer live-executes.** JS was removed from `PREVIEWABLE` and now falls through to the existing `PlaceholderView` ("Ready to run JavaScript — Press **Run** in the editor toolbar above. Output will land in the **Console** tab.") — identical placeholder Python, C, and C++ already showed. Run is the canonical way to execute JS.
- **Line-by-line explanations render as a single-open accordion** ([`ExplanationSidebar.jsx`](src/renderer/components/ExplanationSidebar.jsx)). Each explained line is a collapsible card; everything starts collapsed; clicking a line opens its explanation and auto-closes whichever line was previously open. State (`openIndex`) resets to `-1` on every new explanation so the learner starts from a clean slate. Subtle "click a line to expand" hint sits next to the **Line by Line** heading.

### Removed
- **AI Generate button.** Consolidated into Generate.
- **AI Explain button.** Consolidated into Explain.
- **Live JavaScript preview.** The Live Preview panel no longer renders JS into a sandboxed iframe on every keystroke.
- **Iframe `console.*` capture.** The `CONSOLE_CAPTURE` injected stub, the `__seecode`/`postMessage` bridge, and the parent `message` event listener are gone. Only `runnerOutput` populates the Console tab.
- **`handleAiGenerate` / `handleAiExplain`** in `App.jsx`. Both flows live inside the unified `handleGenerate` / `handleSelectionExplain` callbacks now.
- Dead style entries: `aiBtn` (InstructionPanel), `aiExplainBtn` (CodePanel), `kbd` (LivePreviewPanel).

## [2.5.1] - 2026-05-19

### Fixed
- **Re-release of v2.5.0.** The v2.5.0 GitHub release artifacts were inadvertently built from the v2.4.0 source tree (the `v2.5.0` git tag was pushed against an older commit before the v2.5.0 feature commits landed on `main`). v2.5.1 is a non-destructive re-ship that delivers the full v2.5.0 feature set listed below to installed users via the auto-updater. No code changes vs. the intended v2.5.0 — same toolchain installer, folder-aware Generate, suggestion chips, 12 new templates, expanded glossaries, debounced auto-save, and the rest.

## [2.5.0] - 2026-05-19

### Added
- **Toolchain installer** in *Settings → Toolchains*. seec0de now probes PATH on settings open and shows a status row per language (Python, Node.js for JavaScript, `tsx` for TypeScript, a C compiler, a C++ compiler) with the detected tool's version. Missing tools get a one-line *why we need this*, the platform-correct install command, an **Install** button (drops the command into the bottom terminal and runs it so the learner watches the install happen), a **Copy** fallback, and a **Re-check toolchains** button to refresh the status after the install completes. Backed by a new `runner:check-toolchains` IPC and `seecode.runner.checkToolchains()` preload bridge.
- **Suggestion chips** in the Instruction panel — a random handful of one-tap learner starters ("Print Hello, World!", "FizzBuzz from 1 to 20", "Check if a word is a palindrome", "Find prime numbers up to 50", …) with a Shuffle button to re-roll. Each chip fires Generate immediately so the workspace fills with a real, runnable example without anyone having to invent an instruction.
- **Folder-aware Generate.** When a folder is open, Generate writes the result as a real scratch file (`scratch-1.py`, `scratch-2.py`, …) in the open folder using the practical language and opens it as a file tab — no more in-memory generated tabs competing with on-disk files. The central editor becomes a clean *"this folder is your workspace"* empty state until a file is opened or generated.
- **Inline new-file / new-folder input** in the file explorer. Electron disables `window.prompt()` by default (it returned `null` and the buttons looked dead), so the **+** / folder+ icons now reveal an inline named input with Enter / Esc / blur-to-commit semantics. Newly created files auto-open as a tab.
- **Twelve new generator templates** with curated per-language code: FizzBuzz, palindrome check, prime sieve up to N, reverse string, word-frequency counter, list sort, factorial & Fibonacci, iterate-a-collection, class with inheritance, read/write a text file, fetch JSON from an HTTP API, plus a richer "hello world / greet" baseline. Each template includes pseudocode and idiomatic implementations across the runnable language set.
- **Expanded language glossaries** in `languages.js`. The TypeScript glossary now covers the type system (`interface`, `type`, `enum`, `extends`, `implements`, `as`, `keyof`, `typeof`, `readonly`), visibility modifiers (`public` / `private` / `protected` / `abstract` / `static`), and async — each entry has a short definition and a worked example. Other language glossaries got matching depth.
- **`experimental-features.md`** — a working brainstorm of 20 candidate future features (error-message translator, MRE generator, state visualiser, refactoring assistant, etc.) with one-line *what it teaches* notes. Not wired into the app yet — pure design doc.
- **"beta" tag** in the title bar so users on `experimental-modes` builds know they're on a pre-release surface.

### Changed
- **AI codegen prompt rewritten** ([`aiService.js`](src/renderer/engine/aiService.js)) to forbid teaching comments. The code itself, with meaningful names, is the lesson; the separate Explainer panel handles natural-language explanations. The only comments the model may emit now are short SECTION-MARKER comments (`# --- setup ---`, `// === main ===`) and only when the program has 2+ distinct phases. No more duplicate-of-the-explainer commentary inside the source.
- **Live Preview no longer renders standalone CSS.** The old CSS path injected a fake demo document (Heading One / button / list) under the user's styles, which competed with whatever real `.css` file the learner was editing. CSS now falls through to the placeholder *"CSS needs a document to style — open an HTML file that links to this stylesheet"*, same shape as the Java / Go / Rust placeholder.
- **CodePanel** suppresses the in-memory pseudocode + comparison-language tabs when a folder is open, so the file workspace owns the central panel. The pseudocode banner, the "Lock" button, and the generated-tab strip are all hidden in folder mode.
- **CodePanel button styles** (`fileTab`, `lockBtn`, `explainBtn`) switched from the `border` shorthand to longhand `borderWidth` / `borderStyle` / `borderColor`. The active-variant styles override only `borderBottomColor` / `borderColor`, and React would otherwise throw *"removing a style property during rerender"* warnings as the user toggled tabs / lock state.
- **Landing page** download buttons deep-link to the `v2.4.0` installer asset URL directly rather than `releases/latest`, so a click goes straight to the `.exe` instead of through the GitHub releases page.
- **Renderer window title** is now lowercase (`seec0de` instead of `Seec0de`) to match the brand everywhere else.

### Fixed
- **"New file" / "New folder" buttons no longer silently no-op.** Electron disables `window.prompt()` and the old handlers bailed when it returned `null`. Replaced with an inline input row.

---

## [2.4.0] - 2026-05-15

### Added
- **Live Preview panel** (right-side, collapsible). HTML/CSS/JavaScript render instantly into a sandboxed iframe and update as you type (~250ms debounce) — same FreeCodeCamp/CodeSandbox cause→effect feel. Includes a **Preview** tab (visual render) and a **Console** tab that captures `console.log/info/warn/error/debug` from the iframe plus stdout/stderr from the runner. Manual refresh, clear-console, and an inline Run button live in the panel header.
- **Run output now lands in the Live Preview's Console tab** instead of the bottom terminal. The bottom terminal stays available for typed shell commands; the Console becomes the single home for execution feedback. The panel auto-opens when a run starts.

### Changed
- **Instruction panel is collapsible.** Chevron in the header collapses it to a 32 px vertical rail with an "INSTRUCTION" label; click the rail to expand again. State persists per-install.
- **Explanation panel is collapsible.** Same treatment — collapses to a 32 px rail with an "EXPLANATION" label. Auto-opens when a new explanation arrives so the user actually sees what they asked for.
- **Live Preview panel uses the same collapse pattern.** Expanded, the panel header shows a `>` (chevron-right) to collapse it. Collapsed, it becomes a 32 px rail showing `<` (chevron-left) above the eye icon and a vertical "PREVIEW" label — symmetrical with the Instruction and Explanation rails, so all three side panels behave identically.
- **Active generator tab is lifted to the App level** so the Live Preview can read the same source the editor is showing without re-piping it on every keystroke.
- **Neutral monochrome theme for chrome controls.** Buttons, toggles, and tab indicators no longer use the blue `--accent` or green `--success` fills. They now sit on `--bg-tertiary` / `--bg-elevated` with `--border-strong` outlines and `--text-primary` text, so the whole UI reads as one cohesive surface. The pseudocode tab keeps its dedicated `--algorithm` purple — that mark is pedagogical, not chrome.

### Removed
- **Run button inside the Live Preview panel.** Two Run affordances (one in the editor toolbar, one in the panel header) confused the "where do I click to run?" question. The panel is now strictly an output surface; Run lives only in the editor toolbar (`CodePanel`).
- **Eye-icon toggle in the title bar (next to Settings).** Hiding/showing the Live Preview is now done from the panel itself via the same collapse rail used by the Instruction and Explanation panels — one canonical place to toggle each side panel, no duplicate control up top.

### Docs
- New internal doc: [`docs/preview-console.md`](docs/preview-console.md) explaining how the iframe sandbox, console capture, runner integration, and refresh model all fit together.

---

## [2.3.0] - 2026-05-12
### Added
- **Onboarding flow** for new installs. A two-step modal (skippable at any point) asks (1) "have you coded before?" and (2) "which language do you want to actually build in?" — picked from the runnable set: Python, JavaScript, TypeScript, C, C++. An optional third step accepts a Gemini API key. Answers are persisted in `localStorage` under `seec0de.settings`.
- **Practical language vs. comparison languages model.** The chosen practical language drives the **Run** button, the default new-file extension, and the first language tab. A small set of comparison languages (default: one paired with the practical language) appears alongside, so the learner sees the same algorithm rendered in different syntax — pseudocode is the lesson, languages are the views.
- **Settings drawer** (gear icon, top-right). Right-side overlay with five sections: **Languages** (practical + up to three comparisons), **AI** (Gemini key with show/hide toggle and inline save state), **Workspace** (default visibility for the file explorer + terminal), **About & Updates** (version, last-checked time, "Check now", "Restart & install"), and **Onboarding** ("Rerun onboarding"). Replaces the inline `ApiKeySettings` and `AboutSettings` blocks that used to live in the left panel.
- **Pseudocode tab is visually elevated.** It now uses the dedicated *algorithm* accent (purple) instead of the generic blue, carries a small lightbulb glyph, and shows a one-line banner above the editor — *"Algorithm — read this first. Every language tab is the same idea written in different syntax."*
- **Settings store** at `src/renderer/engine/settings.js` — a single, schema-versioned source of truth for user preferences. Migrations live there.
- **Premium look-and-feel pass.** Inter font (300/400/500/600/700), unified motion tokens (`--motion-fast/base/slow`, `--ease-out`), semantic colour tokens (`--algorithm`, `--success`, `--danger`, `--accent-soft`), keyboard-only focus rings, modal scrim with backdrop blur, slide-in/pop-in animations that respect `prefers-reduced-motion`, and consistent 6 px corner radius across drawers/cards/buttons.

### Changed
- **InstructionPanel** no longer hosts the language-picker chips or the inline AI/About settings. It now shows only the question (instruction textarea) and the two ways to answer it (Generate / AI Generate), plus a passive read-out of which languages will be generated (clickable to open Settings). Languages are managed in Settings.
- **Default panel visibility** for fresh installs: file explorer **off**, terminal **off**. (Existing users keep their last toggle state via per-session `localStorage` keys; the settings defaults only apply on first launch or after a clear.) The toggle is overridable per-session and the per-install default lives in Settings → Workspace.
- TitleBar gained a **gear icon** (Settings) on the right and reorganised the panel toggles on the left so each side balances.

### Removed
- `src/renderer/components/ApiKeySettings.jsx` and `src/renderer/components/AboutSettings.jsx` — both consolidated into the new SettingsDrawer. The legacy `localStorage` key for the API key (`seec0de_gemini_key`) is preserved so nothing on existing machines breaks.

---

## [2.2.0] - 2026-05-11
### Added
- **File explorer.** New left sidebar with a VS-Code-style file tree. Open any folder via the title-bar toggle or the "Open folder" button; create files and folders, refresh, or close the workspace from the panel header. The chosen folder is remembered between launches. Deletes go to the OS recycle bin (via `shell.trashItem`) instead of a hard `rm`.
- **Multi-file editing.** File tabs now sit alongside the Pseudocode/language tabs in the middle panel. Files open in Monaco, are always editable, show a dirty indicator (`•`) when modified, and save with Ctrl+S. Closing a single tab leaves the others intact.
- **Explained terminal.** New collapsible terminal at the bottom of the window (toggle in the title bar or with Ctrl+`). Each command becomes a card with a one-line explanation, stdout/stderr, exit status, and duration. `cd` and `clear` are handled client-side so the cwd persists across commands. Up/Down arrows walk the prompt history (last 50 entries, persisted in `localStorage`). Built-in explanations cover common filesystem builtins, npm/pnpm/yarn, git, docker, node, python, go, cargo, dotnet, and PowerShell `Verb-Noun` cmdlets.
- **Run button** in the code panel. Runs the active editor source through a sandboxed temp directory and pushes the result into the terminal. Supports JavaScript (`node`), TypeScript (`tsx` / `ts-node`), Python (`python` / `python3` / `py`), C (`gcc` / `clang` / `cl`), and C++ (`g++` / `clang++` / `cl`). Missing toolchains return a one-line install hint instead of crashing. Hard 15-second timeout per compile + execute phase, 1 MB output cap per stream.
- Title-bar toggles for the file-explorer and terminal panels (with keyboard shortcut Ctrl+` for the terminal).

### Changed
- Main process now registers three new IPC handler groups (`fs:*`, `term:*`, `runner:*`) and exposes them to the renderer via `window.seecode.fs`, `window.seecode.terminal`, and `window.seecode.runner`.

### Fixed
- Footer copyright on the GitHub Pages landing page used the wrong capitalisation ("Paulmaah" → "PaulMaah").

---

## [2.1.0] - 2026-05-10
### Added
- **In-app update pill.** When a new release is downloaded in the background, a small "Update vX.Y.Z ready" pill appears in the title bar. Click it to see the changelog for the new version (pulled live from the GitHub release notes) and a "Restart & install" button — no more blocking modal dialog.
- **About & Updates settings panel.** New collapsible section in the left panel showing the installed version, when updates were last checked, the current updater status, and a manual "Check now" button. Doubles as a debug surface when updates seem stuck.
- **Real-time download progress** while an update is being fetched from GitHub (visible in both the title-bar pill and the settings panel).

### Changed
- **Update flow is now renderer-driven.** The main process exposes the auto-updater state to the UI over IPC via a new `preload.js` bridge (`window.seecode.updates`), so update affordances live inside the app instead of in OS-level dialogs.

### Fixed
- React warning *"Removing a style property during rerender (borderBottomColor) when a conflicting property is set (borderBottom)"* in `CodePanel`'s tab styles — split the shorthand into longhand `borderBottomWidth/Style/Color` so the active-tab override no longer conflicts with the base style.

---

## [2.0.0] - 2026-05-07
### Changed
- **Unified single-workspace layout.** The middle panel now hosts both generated code and pasted code. Instructions stay on the left, explanations on the right — no more switching between separate "Code" and "Explain" pages.
- The middle panel gained a **read-only ↔ editable** toggle (lock/unlock button on the tab bar). Switch to editable to paste your own code into any language tab; highlight a selection to get explanations.
- Keyword glossary tooltips now work in both read-only and editable modes.

### Removed
- The top-of-window mode tabs (`⟨/⟩ Code` / `📖 Explain`). Both flows are now reachable from the same screen.
- `ModeSelector` and `PasteCodePanel` components (functionality merged into `CodePanel`).

### Fixed
- `npm run dev` no longer 404s at `http://localhost:9000/`. The webpack config now uses `publicPath: '/'` in development so webpack-dev-server serves `index.html` at the root, while still using `'./'` in production for Electron's `file://` loader.

---

## [1.0.0] - 2026-05-07
### Added
- Initial packaged release of seec0de (Windows NSIS installer + portable `.exe`).
- Two modes: **Code** (instruction → pseudocode + 8 languages) and **Explain** (paste code → line-by-line breakdown).
- Built-in keyword glossary for Python, JavaScript, Java, C++, C#, Go, Rust, and TypeScript.
- Optional AI generate / AI explain via Google Gemini.
- Auto-update support via `electron-updater` + GitHub Releases (delta downloads via blockmap).
