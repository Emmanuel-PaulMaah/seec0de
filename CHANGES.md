# Changes since last commit

Baseline: `d62f2a7` — *feat(ui): shadcn motion components, redesign code panel, file explorer, settings, and global styles*
All working-tree changes up to and including this document are committed together on `main`.
Date: 2026-10-08. Verified with `npm run build:renderer` (webpack production build, exit 0; only the pre-existing bundle-size warnings).

---

## Part 1 — Session work (this round of edits)

### 1. Onboarding copy simplified
`src/renderer/components/OnboardingModal.jsx`
- Shortened every step's subtitle/choice text: profile ("Saved on *this device* — no account needed."), experience ("Sets how detailed explanations are."), language ("Used to run and save your work…"), API key ("Everything works offline. A free Google AI key adds smarter code generation…"), and the language-step helper line.
- No behavior changes — steps, validation, Esc/skip, and profile persistence untouched.

### 2. "Insert code" button removed from lesson pages
`src/renderer/components/ActiveLessonCard.jsx`
- Removed the Insert/Inserted button from `TeachingCodeBlock` (it rendered one per teaching code block), plus its handler, `inserted` state, `editorBridge` import, and `insertBtn` style.
- The only button literally labeled "Insert code" in the codebase was here. BuildPanel's example/solution "Insert" buttons and `InlineCode`'s click-to-insert chips were intentionally left alone.

### 3. Workspace tour step 2/6 updated to match the Build panel
`src/renderer/components/WorkspaceTour.jsx`
- Guide-panel step body now reads: "Generate turns a plain-English prompt into pseudocode and code in your languages. Open a folder to browse your files, or switch to Build for a guided project — sample or AI-made — checked step by step." (was: "Write an instruction here and Generate turns it into pseudocode and working code in your chosen languages or open your local folders.")

### 4. Eye-icon inline code restricted to coding views
`src/renderer/components/InlineCode.jsx`, `src/renderer/components/ActiveLessonCard.jsx`, `src/renderer/components/LearnModePanel.jsx`
- Added `InlineCodeStatic` (same syntax-coloured chip, no eye icon, not clickable) and `renderInline(text, { interactive })`.
- **Interactive (kept):** run/fix task box, progressive hints, Fix-it coach, and writing activities (code-along / drill / edit).
- **Static (stripped):** teaching paragraphs & notes in `ActiveLessonCard`, and read-only activities (worked-example / prediction) in `LearnModePanel` via `inlineInteractive = WRITING_ACTIVITY_TYPES.has(type)`.
- Untouched: BuildPanel step text (Build isn't lessons), Live Preview error fixes (run-time = coding context), Learn-home exercise preview cards (catalog, not a lesson page; editor isn't mounted there).

---

## Part 2 — Pre-existing uncommitted work carried into this commit

### Landing page / packaging
- `index.html` — ~1,020 lines of inline `<style>` extracted to new `index-style.css` (linked from the head); markup/script otherwise intact.
- Self-hosted UI font: `package.json` / `package-lock.json` add `@fontsource-variable/inter`; `src/renderer/index.jsx` imports it (offline-capable, no CDN); `webpack.renderer.js` font asset rule widened to `woff2?|eot|ttf|otf`.
- `skills-lock.json` (new) — lockfile for the installed `beui` skill (`starc007/ui-components`).

### Plain-language copy sweep (errors & helper text)
- `src/main/aiService.js` — network/timeout/TLS/API errors rewritten in plain English (e.g. "Can't reach AI right now — looks like your internet is disconnected…"); captures `rawApiMessage`.
- `src/main/runnerService.js` — runner errors simplified ("Nothing to run yet — add some code first.", "Code didn't compile — check the errors below.", Node install hints, unsupported-language message).
- `src/renderer/App.jsx` — file open/save/auto-save/generate/AI error messages simplified; new `runAttempt` state and `runOutcome` prop wired to `CodePanel`; `HomeScreen` receives `activeLessonTitle` / `activeLessonLanguage`.
- `src/renderer/engine/aiService.js`, `src/renderer/data/buildProjects.js`, `src/renderer/components/ProfileForm.jsx` (avatar errors), `LessonsPanel.jsx`, `LivePreviewPanel.jsx` (empty-state placeholder), `TerminalPanel.jsx` ("Type a command below…"), `SandboxTerminal.jsx` (git command help map rewritten in simpler wording).

### Motion / beUI component adoption
- New components under `src/renderer/components/motion/`: `chromatic-text-reveal`, `expanding-arrow-button`, `morphing-file-tabs`, `morphing-search`, `otp-input`, `project-folder`, `scroll-progress`, `text-reveal`.
- New hooks under `src/renderer/lib/hooks/`: `use-on-open.js`, `use-row-cursor.js`.
- Swaps/adoptions: shared `Loader` replaces lucide `Loader` + CSS spin (SettingsDrawer, BulletinSection, ExplanationSidebar, SandboxTerminal, TerminalPanel); `Switch`/`OTPInput`/`Tabs` in SettingsDrawer; `OTPInput` for ProfileGate PIN entry; `ScrollProgress` + `BouncyAccordion` in ExplanationSidebar; `MorphingSearch` in FileExplorer; `ExpandingArrowButton`/`TextReveal`/`ChromaticName` on HomeScreen CTA tiles.
- Small fixes to existing motion pieces: `bouncy-accordion` (group-radius animation simplified), `select`, `switch`, `tabs`.
- `KeywordTooltip.jsx` — now portal-rendered (`createPortal`) with motion enter/exit animation and clip transitions.

### UI / behavior refinements
- `SettingsDrawer.jsx` — largest component diff: section restructure plus motion imports (layout animations, reduced-motion aware).
- `BuildPanel.jsx` — project discovery split into "rooms" (home = AI composer, personal projects, sample library with stack filter) so the picker isn't one long scroll.
- `CodePanel.jsx` — selection tracking buffered in refs during drag (commit on mouseup), skips tracking in lesson/pseudocode tabs, `canExplainRef` sync; consumes new `runAttempt`/`runOutcome`.
- `HomeScreen.jsx` — language-id label map, active-lesson resume display, expanding-arrow CTA tiles with brand-accent primary.
- `FileExplorer.jsx` — file-type icons (`FileCode`/`FileText`) replace the extension colour map; morphing search.
- `BulletinSection.jsx` — card refactor: whole-card anchor, tone modifier classes in CSS, "Did You Know" picks a second curated article.
- `ExplanationSidebar.jsx`, `ProfileGate.jsx`, `InstructionPanel.jsx`, `LessonsPanel.jsx`, `LivePreviewPanel.jsx`, `presence-gate.jsx` — layout/copy/spacing polish.
- `src/renderer/styles/global.css` — large refactor (~1,820 lines touched): header/token reorganization, `--color-border-strong` added to the Tailwind `@theme` mapping (`@import "tailwindcss"` retained).

### Lesson content
- `src/renderer/data/lessons/javascript.json` — teaching copy rewritten across the course (clearer explanations of printing, comments, variables/`let`/`const`, added naming-rule note, updated examples).
- `src/renderer/data/lessons/python.json` — string-concat example corrected (`'sea' + 'code'` → `'see' + 'code'` → `seecode`).

---

## Verification
- `npm run build:renderer` after the final source edit: exit 0 (3 pre-existing webpack bundle-size warnings; no errors).
- No test suite, linter, or typechecker exists in this repo.
- Not smoke-tested in the running Electron app (`npm run dev`).
