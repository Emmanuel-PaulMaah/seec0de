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

## [1.0.0] - 2026-05-07
### Added
- Initial packaged release of seec0de (Windows NSIS installer + portable `.exe`).
- Two modes: **Code** (instruction → pseudocode + 8 languages) and **Explain** (paste code → line-by-line breakdown).
- Built-in keyword glossary for Python, JavaScript, Java, C++, C#, Go, Rust, and TypeScript.
- Optional AI generate / AI explain via Google Gemini.
- Auto-update support via `electron-updater` + GitHub Releases (delta downloads via blockmap).
