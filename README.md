# ⟨/⟩ seec0de

**Write natural instructions, see pseudocode & code. Select code, see explanations. Run it. All in one window.**

`seec0de` is a modern desktop learning environment and hybrid IDE built to bridge the gap between natural language instructions and real programming code. Designed for students, self-taught developers, and multi-language programmers, `seec0de` allows you to describe what you want to build in plain English and instantly view the logic represented in clear pseudocode alongside real code across up to 8 programming languages.

---

## ⚡ Quick Start

```bash
# Clone the repository and install dependencies
npm install

# Start the application in development mode
npm run dev
```

The application will launch in its own Electron window with Webpack Hot Module Replacement (HMR) enabled.

---

## 🎯 What You Can Do

`seec0de` features a flexible, multi-column workspace layout (**File Explorer · Instruction / Learn Panel · Code Panel · Live Preview / Console · Explanation Sidebar**) with an **Explained Terminal** docked at the bottom. Each side panel can be resized or collapsed into a compact 32px rail.

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
- **Toolchain Auto-Discovery:** `seec0de` checks your system `PATH` on launch for installed compilers and interpreters. Missing tools trigger a friendly setup guide under **Settings → Toolchains**.

### 4. Live HTML/CSS Preview
- **Real-Time Web Rendering:** Renders HTML and linked CSS in a sandboxed iframe with a ~250ms debounced live update as you type.
- **Console Toggle:** Quickly switch between live web previews and code execution outputs.

### 5. Plain-English Error Translation
- **Human-Readable Diagnostics:** When code execution fails, `seec0de` intercepts the raw `stderr` and displays a clear error card containing a plain-English explanation and 2–5 actionable fixes.
- **Offline & AI-Powered:** Covers common syntax and runtime errors offline across JS, TS, Python, C, and C++. Recognizes custom variable names and falls back to an AI error translator when connected.

### 6. Learn Mode & Interactive Drills
- **Curated Track & Courses:** Switch the Instruction Panel from *Build* to *Learn Mode* to access curated lessons, practice exercises, and multi-checkpoint capstone projects.
- **Interactive Exercise Formats:** Includes Code-alongs, Retrieval drills, Fix drills, Parsons problems (line reordering), Faded examples (fill-in-the-blank), Output-first builds, and Micro-capstones.
- **Auto-Verification & Reminders:** Automatically verifies output against success criteria upon running code, tracks completion across user profiles, and schedules spaced learning reminders.

### 7. Explained Terminal
- **Command Explainer Card:** Integrated collapsible bottom terminal (`Ctrl + ~`) that intercepts shell commands and generates 1-line plain-English explanations alongside output, exit codes, and execution duration.
- **Wide Tool Support:** Explains commands for Git, npm, pnpm, yarn, Docker, Node.js, Python, Rust (Cargo), Go, .NET, and PowerShell cmdlets.
- **Smart Client Handling:** Client-side handling for `cd` and `clear` preserves working directory state between commands, with a 50-item persisted command history buffer.

### 8. Keyword Glossary & Typography
- **Interactive Tooltips:** Click any syntax-highlighted keyword in the Monaco Editor to view a definition and short code snippet (covers 15–30 keywords per language, including `rust match`, `go defer`, `python with`, `typescript interface`).
- **Font Controls:** On-screen `A-` / `A+` buttons and keyboard shortcuts (`Ctrl/Cmd +` / `-` / `0`) scale Monaco Editor typography smoothly between 10px and 28px.

### 9. User Profiles & Multi-File Workspace
- **Profile Manager:** Manage multiple user profiles with independent settings, active learning tracks, and progress tracking.
- **Monaco Multi-Tab Editor:** Edit project files with auto-save (600ms debounce), dirty file state indicators, and customized dark theme (`hc-black`).

---

## 🛠 Supported Languages

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

## 📦 Building & Packaging

```bash
# Build the renderer bundle for production
npm run build:renderer

# Build Windows installer and portable executable (.exe)
npm run dist:win
```

Build outputs land in the `release/` directory. Auto-updates are managed via `electron-updater`.

---

## 📄 License & Release Notes

- **Repository:** [GitHub - Emmanuel-PaulMaah/seec0de](https://github.com/Emmanuel-PaulMaah/seec0de)
- **Releases:** Download installers from [GitHub Releases](https://github.com/Emmanuel-PaulMaah/seec0de/releases)
- **Changelog:** See [CHANGELOG.md](CHANGELOG.md) for full version history.
