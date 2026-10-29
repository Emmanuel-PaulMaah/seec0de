# ⟨/⟩ seec0de

**Write natural instructions, see pseudocode & code. Select code, see explanations. Run it. All in one window.**

`seec0de` is a modern desktop learning environment and hybrid IDE built to bridge the gap between natural language instructions and real programming code. Designed for students, self-taught developers, and multi-language programmers, `seec0de` allows you to describe what you want to build in plain English and instantly view the logic represented in clear pseudocode alongside real code across up to 8 programming languages.

---

## Quick Start

```bash
# Clone the repository and install dependencies
npm install

# Start the application in development mode
npm run dev
```

The application will launch in its own Electron window with Webpack Hot Module Replacement (HMR) enabled.

---

## What You Can Do

`seec0de` features a flexible, multi-column workspace layout (**File Explorer · Build / Learn Panel · Code Panel · Live Preview / Console · Explanation Sidebar**) with an **Explained Terminal** docked at the bottom. Each side panel can be resized or collapsed into a compact 32px rail — `Ctrl+B` toggles the left sidebar, and `Ctrl+.` drops everything but the editor for focus mode.

### 1. Describe → See Code (Dual-Engine Generation)
- **Natural Language Prompts:** Type what you want to build (e.g., *"sort a list of numbers"*, *"fizzbuzz from 1 to 20"*, *"check if a word is a palindrome"*, *"read a csv file & print top 5 averages"*), or pick from randomized suggestion chips (shuffle).
- **Dual-Engine AI & Offline Fallback:** Click **Generate**. If an API key is configured in **Settings → AI** and you are online, `seec0de` leverages Google Gemini API for context-aware code generation. If offline or without an API key, it seamlessly switches to the built-in offline template engine covering common routines (sorting, file I/O, string manipulation, HTTP requests, loops, classes, and algorithms).
- **Multi-Language Side-by-Side View:** View generated results across up to 8 languages (Python, JavaScript, TypeScript, Java, C++, C, C#, Go, Rust) plus a standardized Pseudocode tab for conceptual learning.
- **Direct Workspace Integration:** When a folder is open in the File Explorer, clicking **Generate** automatically writes the code directly into scratch files (`scratch-1.py`, `scratch-2.js`, etc.) within your workspace.

### 2. Select Code → Contextual Explanations
- **Line-by-Line Breakdown:** Highlight any code snippet in the editor to reveal the **Explain** floating action button. Clicking it generates a line-by-line explanation in the right-hand **Explanation Sidebar**.
- **Single-Open Accordion:** Explanations load in a clean accordion interface where opening a line automatically collapses previous lines, letting you digest code line by line.
- **Contextual & Offline Modes:** Uses Gemini AI for personalized explanations referencing your exact variable and function names, falling back to an offline glossary explainer when offline.

### 3. Sandboxed Multi-Language Code Runner
- **In-App Execution:** Execute JavaScript (Node.js), TypeScript (tsx / ts-node), Python, C (GCC / Clang / MSVC), and C++ directly within the application.
- **Console Integration:** Execution output (stdout / stderr) streams directly to the **Console** tab in the Live Preview panel.
- **Stop a running program.** While code is running, the **Run** button becomes **Stop** — one click ends the process (and any children it spawned) without being counted as a failed attempt or a failed lesson run.
- **Toolchain Auto-Discovery:** `seec0de` checks your system `PATH` on launch for installed compilers and interpreters. Missing tools trigger a friendly setup guide under **Settings → Toolchains**.

### 4. Live HTML/CSS Preview
- **Real-Time Web Rendering:** Renders HTML and linked CSS in a sandboxed iframe with a ~250ms debounced live update as you type.
- **Console Toggle:** Quickly switch between live web previews and code execution outputs.

### 5. Plain-English Error Translation
- **Human-Readable Diagnostics:** When code execution fails, `seec0de` intercepts the raw `stderr` and displays a clear error card containing a plain-English explanation and 2–5 actionable fixes.
- **Offline & AI-Powered:** Covers common syntax and runtime errors offline across JS, TS, Python, C, and C++. Recognizes custom variable names and falls back to an AI error translator when connected.

### 6. Learn Mode & Interactive Drills
- **Twenty-two courses:** JavaScript, Python, TypeScript, React, HTML, CSS, **HTTP & Web APIs** (9 lessons across *Requests & Responses*, *The Browser in the Middle* and *Clients That Survive* — request anatomy, status codes, reading response bodies, CORS and preflight, cookies and credentials, the Network tab, deadlines with `AbortSignal`, retries with backoff and webhook signatures), Git, **Node.js** (16 lessons across *Node.js Core*, *Modules & npm*, and *Server Basics* — runtime, `fs`, `require`/exports, `npm`, the `http` module and a JSON API — all runnable in-app), **MongoDB** (12 lessons — documents, `insertOne`/`find`, query operators, updates and deletes, pipelines and the Node.js driver), **Express** (12 lessons across *Express Foundations*, *Building REST APIs* and *Middleware & Errors* — routing, params and query strings, JSON bodies, status codes, middleware and error handling), **SQL & PostgreSQL** (12 lessons across *Querying Tables*, *Relationships & Joins* and *Changing Data Safely* — filtering, aggregates, keys, joins, transactions and indexes), **Next.js** (12 lessons across *App Router Basics*, *Data & Loading States* and *Mutations & Caching* — pages, layouts, server components, `loading`/`error`, route handlers and server actions), **Auth & Sessions** (12 lessons across *Passwords*, *Sessions & Cookies* and *Tokens & Access Control* — bcrypt, cookie flags, JWT verification, roles and reset tokens), **Docker & Deployment** (12 lessons across *Images & Containers*, *Compose & Services* and *Shipping to Production* — Dockerfiles, layer caching, compose with a database, multi-stage builds and releases) and **Testing** (12 lessons across *Unit Tests*, *API Tests* and *End-to-End* — Vitest assertions and mocks, supertest, database fixtures and Playwright in CI), plus six senior courses of 9 lessons each: **Web Security**, **Performance & Caching**, **System Design**, **CI/CD & Release**, **Observability** and **Accessibility** — the concerns that separate working code from code you can ship. MongoDB, HTTP & Web APIs and the full-stack courses are checked against the source you write, the same `sourceChecks` path Git, HTML and CSS use, so no server or browser is needed to learn them. Switch the Build panel from *Build* to *Learn* to browse the catalog.
- **Interactive Exercise Formats:** Includes Code-alongs, Retrieval drills, Fix drills, Parsons problems (line reordering), Faded examples (fill-in-the-blank), Output-first builds, and Micro-capstones.
- **Explain it back:** After a lesson passes, an optional prompt asks you to explain the concept in your own words. Notes stay on your profile and are reviewable from the Learn catalog; lessons across the courses carry reflection prompts aimed at the *why*, not the syntax.
- **Auto-Verification & Reminders:** Automatically verifies output against success criteria upon running code, tracks completion across user profiles, and schedules spaced learning reminders.

### 7. Explained Terminal
- **Command Explainer Card:** Integrated collapsible bottom terminal (`Ctrl + ~`) that intercepts shell commands and generates 1-line plain-English explanations alongside output, exit codes, and execution duration.
- **Wide Tool Support:** Explains commands for Git, npm, pnpm, yarn, Docker, Node.js, Python, Rust (Cargo), Go, .NET, and PowerShell cmdlets.
- **Smart Client Handling:** Client-side handling for `cd` and `clear` preserves working directory state between commands, with a 50-item persisted command history buffer.

### 8. Keyword Glossary & Typography
- **Interactive Tooltips:** Click any syntax-highlighted keyword in the Monaco Editor to view a definition and short code snippet (covers 15–30 keywords per language, including `rust match`, `go defer`, `python with`, `typescript interface`).
- **Font Controls:** On-screen `A-` / `A+` buttons scale Monaco Editor typography between 10px and 28px; `Ctrl/Cmd +` / `-` / `0` zoom the whole app.

### 9. User Profiles & Multi-File Workspace
- **Profile Manager:** Manage multiple user profiles with independent settings, active learning tracks, and progress tracking.
- **Monaco Multi-Tab Editor:** Edit project files with auto-save (600ms debounce), dirty file state indicators, and customized dark theme (`hc-black`).

### 10. Build Panel — Guided Step-by-Step Projects
- **Open a folder → guided projects:** With a folder open, the Build panel becomes a project builder. Pick a **Sample Project** from the accordion list, or **Build with AI** — describe an idea and Gemini designs a guided project with verifiable steps, checks, and a solution (AI projects land under **My Creations** and persist locally).
- **Start-build dialog:** Before anything touches disk you choose a **project name** (doubles as the subfolder name), **where the files go** (the open folder or a new subfolder), and whether to **pre-fill starter files**.
- **Verifiable steps:** Each step targets one file and runs **live content checks** as you edit; steps with runnable output are gated on **Run**, with a **Check step** button for setup-style steps. Completed steps collapse to a ✓ row, **Back** / clickable step rows let you revisit earlier steps, and finishing the project fires confetti + a fanfare (both respect the Sounds setting).
- **Real multi-file projects:** The runner executes build files **in the project folder**, so multi-file code can `require()` sibling modules and be verified against its real output. Two terminal-first samples — **Realtime Chat** (`ws`) and **Notes API** (Express) — teach the real `npm init` / `npm install` workflow, verified via terminal checks. Two games join the library: **Starfall** (Python/pygame — pure, headless-tested rules in `game.py`, the pygame shell in `main.py`) and **Orbit Runner** (three.js in one self-contained `index.html`, with a scaffolded `check.mjs` that gates every step on real syntax).

### 11. Guided Setup — AI key & toolchains
- **Get a free AI key in three steps.** The "Get a free key" links open Google AI Studio in your real browser (where your Google session already lives), so sign-in is not blocked as an embedded browser. Onboarding step 3 then walks you through it: when you come back to seec0de with a key on the clipboard (`AIza…` legacy or `AQ.…` new), it offers one-click paste, validates the key live against the API, and only then unlocks **Save** — wrong keys are rejected at entry, and network failures are told apart from bad keys. Settings → AI has a matching Paste button.
- **Toolchain setup that works on any Windows PC, winget or not.** Settings → Toolchains probes winget *and* the languages; if winget is missing you get manual download links plus per-language numbered steps (including the MSYS2 `pacman` line to paste into the terminal). Every missing tool shows a numbered list — install, wait for exit code 0, **Re-check toolchains**, then the smoke test — with the current step highlighted while an install runs.
- **Installs are never cut short.** Terminal commands clamp timeouts sanely (5 s – 15 min), installer-shaped commands (`winget install`, `npm -g`, `pacman -S`) get a 10-minute budget, and the Windows PATH is re-read from the registry so `node --version` works immediately after an install — no app restart.

### 12. Accessibility & Keyboard Support
- **Read-aloud (Speak).** A **Speak** button in the lesson header and on the Explanation panel reads the text with the built-in, offline Web Speech API — in lessons it reads the page you're on (teaching, the current activity, or the coding task); explanations highlight sentence-by-sentence while reading, with Pause/Stop during playback and only one reading ever in flight.
- **Full keyboard reach.** Every hand-rolled modal traps focus and returns it on close; right-click menus open with Shift+F10 / the ContextMenu key and rove with Arrow/Home/End; `F2` renames the active file; `Ctrl+B` toggles the left sidebar; `Ctrl+.` toggles **Focus mode** (editor only, everything else hidden and restored on exit).
- **Visible & announced state.** Focus rings on every control, `role="log"` live regions for terminal/sandbox/console output, `role="status"` for check results and explanations, and `aria-label`s on every icon-only button.
- **Colour that passes WCAG AA** in both the dark and light themes (text, accents, semantic and syntax colours), native controls that follow the active theme, and OS **reduce-motion** respected across all animations.
- **Destructive actions ask first.** Closing unsaved files, resetting lesson code, deleting projects/postcards, clearing terminals and "Restart & install" all confirm through one shared dialog.

### 13. A Refreshed Look — beUI, shadcn & Tailwind
- **beUI component library.** Animated components from [beui.dev](https://beui.dev) — tabs, morphing file tabs, file tree, loaders, selects, switches, drawer, tooltip, theme toggle, bouncy accordion, popover morph, OTP PIN pad, morphing search, scroll progress, text reveal, expanding arrow and the Button family — are vendored in `src/renderer/components/motion/` and wired through the Build panel, editor tabs, file explorer, Settings, profile PIN, title bar, explanation sidebar and home screen.
- **shadcn + Tailwind v4 toolchain.** `components.json` (registry config), shared Button / Input / Dialog primitives with a `cn()` helper (`clsx` + `tailwind-merge`), and `@import "tailwindcss"` driving `global.css`.
- **17 polish touches.** 6px scrollbars, `kbd` shortcut hints, tabular numerals in code, heading letter-spacing, card hover glow, gradient title-bar separator, a one-shot Run pulse when code becomes runnable, staggered explanation rows, progress bars on Learn home cards, ▶ in Workspace / ✓ in Learn on the Run button, and a bundled Inter variable font.

---

## Supported Languages

| Language | Describe → Code | In-App Runner | Live Preview | Glossary Support |
|---|:---:|:---:|:---:|:---:|
| **Python** | ✅ | ✅ | — | ✅ |
| **JavaScript** | ✅ | ✅ | — | ✅ |
| **TypeScript** | ✅ | ✅ | — | ✅ |
| **C** | ✅ | ✅ | — | ✅ |
| **C++** | ✅ | ✅ | — | ✅ |
| **HTML / CSS** | — | — | ✅ | ✅ |
| **Java** | ✅ | — | — | ✅ |
| **C#** | ✅ | — | — | ✅ |
| **Go** | ✅ | — | — | ✅ |
| **Rust** | ✅ | — | — | ✅ |
| **Pseudocode** | ✅ | — | — | ✅ |

---

## Privacy & Security Architecture

- **Encrypted API Key Storage:** API keys for Google Gemini API are stored encrypted at rest in the main Electron process using OS-level safe storage (`DPAPI` on Windows, `Keychain` on macOS, `libsecret` on Linux). The renderer process never accesses raw key data.
- **Sanitized Process Environment:** All child processes (code runner, terminal shell) execute with a whitelisted set of environment variables (`getSafeEnv()`) to prevent sensitive environment variables from leaking into user scripts.
- **Scoped Filesystem Access:** IPC filesystem operations are strictly validated against the active project workspace root and OS temporary directories.

---

## Building & Packaging

```bash
# Build the renderer bundle for production
npm run build:renderer

# Build Windows installer and portable executable (.exe)
npm run dist:win
```

Build outputs land in the `release/` directory. Auto-updates are managed via `electron-updater`.

---

## License & Release Notes

- **Repository:** [GitHub - Emmanuel-PaulMaah/seec0de](https://github.com/Emmanuel-PaulMaah/seec0de)
- **Releases:** Download installers from [GitHub Releases](https://github.com/Emmanuel-PaulMaah/seec0de/releases)
- **Changelog:** See [CHANGELOG.md](CHANGELOG.md) for full version history.
