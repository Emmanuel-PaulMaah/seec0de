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
