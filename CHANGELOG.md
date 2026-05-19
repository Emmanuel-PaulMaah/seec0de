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
