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

<!-- Add entries here as you work; they'll move under the next version when it ships. -->

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
