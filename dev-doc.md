# Seec0de — Developer Documentation

Technical reference for working on Seec0de. For the user-facing overview, see [README.md](README.md).

---

## Quick Start

```bash
npm install
npm run dev
```

This starts the Webpack dev server and launches the Electron window. The app loads at `http://localhost:9000` inside Electron.

To run Electron alone against a pre-built bundle:

```bash
npx webpack --config webpack.renderer.js
npm start
```

---

## Project Structure

```
seec0de/
├── package.json                   # Dependencies and scripts
├── webpack.renderer.js            # Webpack config for the React renderer
├── src/
│   ├── main/
│   │   └── main.js                # Electron main process — creates the window
│   └── renderer/
│       ├── index.html             # HTML shell
│       ├── index.jsx              # React entry point
│       ├── App.jsx                # Root component — state management & routing
│       ├── styles/
│       │   └── global.css         # CSS variables, dark theme, scrollbar styling
│       ├── components/
│       │   ├── TitleBar.jsx       # App title bar with logo
│       │   ├── ModeSelector.jsx   # Instruct/Paste mode tabs
│       │   ├── InstructionPanel.jsx  # Left panel — language chips + text input
│       │   ├── CodePanel.jsx      # Center — tabbed Monaco editors (read-only)
│       │   ├── PasteCodePanel.jsx # Center — editable Monaco editor with selection detection
│       │   └── ExplanationSidebar.jsx  # Right — explanations + glossary
│       └── engine/
│           ├── languages.js       # Language definitions + keyword glossaries
│           ├── codeGenerator.js   # Instruction → pseudocode + code (pattern matching)
│           └── codeExplainer.js   # Code → line-by-line explanations (regex parsing)
└── dist/                          # Webpack output (generated)
```

---

## Architecture

### Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | **Electron 28** |
| UI framework | **React 18** |
| Code editor | **Monaco Editor** (via `@monaco-editor/react`) |
| Bundler | **Webpack 5** with Babel |
| Styling | Inline styles with CSS custom properties |

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                        App.jsx                          │
│  Manages all state: mode, languages, code, explanations │
├──────────┬──────────────────────┬───────────────────────┤
│          │                      │                       │
│  Instruct Mode             Paste Mode          Sidebar  │
│  ┌──────────────┐    ┌──────────────────┐   ┌────────┐ │
│  │ Instruction  │    │  PasteCodePanel  │   │Explain │ │
│  │   Panel      │    │  (editable       │   │ation   │ │
│  │              │    │   Monaco)        │   │Sidebar │ │
│  └──────┬───────┘    └────────┬─────────┘   └───┬────┘ │
│         │                     │                  │      │
│         ▼                     ▼                  │      │
│  ┌──────────────┐    ┌──────────────────┐        │      │
│  │ codeGenerator│    │  codeExplainer   │────────┘      │
│  │  .js         │    │   .js            │               │
│  └──────┬───────┘    └──────────────────┘               │
│         │                                               │
│         ▼                                               │
│  ┌──────────────┐                                       │
│  │  CodePanel   │    ┌──────────────────┐               │
│  │ (read-only   │    │  languages.js    │               │
│  │  Monaco tabs)│    │  (glossaries)    │               │
│  └──────────────┘    └──────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

### How the Code Generator Works (`codeGenerator.js`)

The generator uses **regex pattern matching** on the instruction text. Each template defines:
- A `match` regex (e.g. `/\b(sort|sorting|order)\b/i`)
- A `pseudocode` string
- A `code` object with real implementations for all 8 languages

When you type "sort a list of numbers", the regex matches `sort`, and the generator returns the bubble sort template with pseudocode + all language implementations.

If no template matches, it generates a fallback skeleton with your instruction as a comment.

### How the Code Explainer Works (`codeExplainer.js`)

The explainer uses **language-aware regex patterns** to parse each line:
1. Detects the overall structure (has classes? functions? loops? conditionals?) → generates a summary.
2. Walks each line and matches against patterns for: comments, imports, class definitions, function definitions, variable assignments, print statements, return statements, conditionals, loops, try/catch, method calls, decorators, and more.
3. Each match produces a plain-English explanation specific to the language.

### How the Glossary Works (`languages.js`)

Each of the 8 languages has a `glossary` object mapping keyword strings to `{ definition, example }` entries. When a keyword is clicked in the editor, `App.jsx` looks up the glossary for that language and displays the entry in the sidebar.

---

## Supported Languages

| Language | ID | Keywords in Glossary |
|---|---|---|
| Python | `python` | `def`, `class`, `if`, `elif`, `for`, `while`, `return`, `import`, `try`, `with`, `lambda`, `print`, `range`, `None`, etc. |
| JavaScript | `javascript` | `const`, `let`, `function`, `if`, `for`, `while`, `return`, `class`, `import`, `async`, `await`, `try`, `=>`, `console.log`, etc. |
| Java | `java` | `public`, `private`, `class`, `static`, `void`, `if`, `for`, `while`, `return`, `new`, `import`, `extends`, `implements`, etc. |
| C++ | `cpp` | `#include`, `using`, `int`, `void`, `class`, `if`, `for`, `while`, `return`, `cout`, `auto`, `new`, `template`, etc. |
| C# | `csharp` | `using`, `class`, `public`, `static`, `void`, `if`, `for`, `foreach`, `while`, `return`, `var`, `async`, `await`, etc. |
| Go | `go` | `package`, `import`, `func`, `if`, `for`, `range`, `return`, `struct`, `type`, `var`, `:=`, `interface`, `go`, `defer`, `chan`, etc. |
| Rust | `rust` | `fn`, `let`, `let mut`, `if`, `for`, `loop`, `while`, `match`, `struct`, `impl`, `enum`, `trait`, `use`, `pub`, `Option`, `Result`, etc. |
| TypeScript | `typescript` | `const`, `let`, `function`, `interface`, `type`, `class`, `if`, `for`, `while`, `return`, `import`, `async`, `enum`, etc. |

---

## UI Theme

The app uses a VS Code–inspired dark theme defined as CSS custom properties in `global.css`:

| Variable | Color | Usage |
|---|---|---|
| `--bg-primary` | `#1e1e1e` | Main background |
| `--bg-secondary` | `#252526` | Panels, sidebars |
| `--bg-tertiary` | `#2d2d2d` | Inactive chips, hover |
| `--accent` | `#007acc` | Active tabs, buttons, highlights |
| `--text-primary` | `#cccccc` | Main text |
| `--text-secondary` | `#969696` | Labels, secondary text |
| `--keyword-highlight` | `#569cd6` | Keywords in glossary |
| `--string-highlight` | `#ce9178` | Code examples |
| `--function-highlight` | `#dcdcaa` | Line-by-line code display |

---

## Extending Seec0de

### Adding a new instruction template

Edit `src/renderer/engine/codeGenerator.js` and add a new entry to the `TEMPLATES` object:

```js
myTemplate: {
  match: /\b(your|trigger|words)\b/i,
  pseudocode: `PROGRAM MyTemplate\n  ...`,
  code: {
    python: `# Python implementation...`,
    javascript: `// JavaScript implementation...`,
    // ... all 8 languages
  },
},
```

### Adding a new language

1. Add the language entry to `LANGUAGES` in `src/renderer/engine/languages.js` with a `label`, `monacoId`, and `glossary`.
2. Add it to the `LANGUAGE_OPTIONS` arrays in `InstructionPanel.jsx` and `PasteCodePanel.jsx`.
3. Add it to the `LANGUAGE_MONACO_MAP` and `LANGUAGE_LABELS` in `CodePanel.jsx`.
4. Add code for it in every template in `codeGenerator.js`.

### Adding glossary keywords

Add entries to the `glossary` object for any language in `languages.js`:

```js
'keyword': {
  definition: 'What this keyword does.',
  example: 'code example showing usage'
},
```

---

## Packaging (Windows installer)

Seec0de is packaged with **electron-builder**. The Windows pipeline produces an NSIS installer and a portable `.exe`.

### Build it

```bash
npm run dist:win
```

This runs:
1. `npm run build:renderer` — Webpack production build of the React renderer into `dist/`.
2. `electron-builder --win` — bundles `src/main/`, `dist/`, and `package.json` with Electron and emits artifacts to `release/`.

### Output artifacts

After a successful build, `release/` contains:

| File | Purpose |
|---|---|
| `seec0de Setup 1.0.0.exe` | NSIS installer — user picks install location, creates Start-menu/desktop shortcuts, registers an uninstaller. |
| `seec0de 1.0.0.exe` | Portable single-file build — runs without installation. |
| `win-unpacked/` | Raw unpacked app folder; `seec0de.exe` inside runs the app directly. |
| `latest.yml` / `*.blockmap` | Auto-update metadata (only used if you wire up an update feed). |

### Configuration

The `build` field in `package.json` controls electron-builder:

```json
"build": {
  "appId": "com.emmanuelpaulmaah.seec0de",
  "productName": "seec0de",
  "files": ["src/main/**/*", "dist/**/*", "package.json"],
  "directories": { "output": "release" },
  "win": { "target": ["nsis", "portable"] },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "perMachine": false
  }
}
```

### Webpack production behaviour

`webpack.renderer.js` is exported as a function so it picks up `--mode production`:
- Disables source maps in production.
- Sets `output.publicPath: './'` so the packaged renderer resolves assets relative to `file://…/dist/index.html` (Electron loads via `loadFile` in production — see `src/main/main.js`).

### Dev vs. production loading

`src/main/main.js` switches based on `app.isPackaged`:

```js
const isDev = !app.isPackaged;
if (isDev) {
  mainWindow.loadURL('http://localhost:9000');
} else {
  mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
}
```

### Code signing

The current build is **unsigned**. We pass `CSC_IDENTITY_AUTO_DISCOVERY=false` so electron-builder doesn't look for a certificate. SmartScreen will warn users on first launch — that's expected without an EV/OV code-signing cert.

To sign in the future, set `CSC_LINK` (path/URL to `.pfx`) and `CSC_KEY_PASSWORD` env vars before running `dist:win`.

### App icon

Currently the default Electron icon is used. To brand it:
1. Place a 256×256 `.ico` at `build/icon.ico`.
2. Add `"icon": "build/icon.ico"` under `build.win` in `package.json`.

### Known Windows gotcha — winCodeSign symlinks

On a first build, electron-builder downloads `winCodeSign-2.6.0.7z`, which contains macOS `.dylib` **symbolic links**. Windows refuses to create symlinks without admin rights or Developer Mode, so 7-Zip exits with code 2 and electron-builder retries forever.

Workaround (one-time, already applied on this machine):

```powershell
# 1. Pre-extract the cache without symlinks
& "node_modules\7zip-bin\win\x64\7za.exe" x -bd -snl `
  "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign\<random>.7z" `
  "-o$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0" -y

# 2. Stub the two missing dylibs so future checks pass
New-Item -ItemType File -Force `
  "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0\darwin\10.12\lib\libcrypto.dylib", `
  "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0\darwin\10.12\lib\libssl.dylib"
```

Permanent fixes (pick one):
- Enable **Windows Developer Mode** (Settings → Privacy & Security → For developers).
- Run the build shell as Administrator.
- Skip the cache entirely by signing through a different toolchain.

### Cross-platform builds

- **macOS** `.dmg` / `.zip` can only be produced on macOS, and a distributable build needs an Apple Developer cert + notarization.
- **Linux** `AppImage` / `deb` can be produced on Windows or Linux. Add a `linux` target block to the `build` config and a `dist:linux` script if needed.

### Versioning & release hygiene

- Bump `version` in `package.json` before each release; the version is embedded in artifact filenames and the installer.
- Add `release/` to `.gitignore` — installers are large (~90 MB each) and should not be committed.

---

## Auto-updates (push code changes without re-downloading)

Seec0de uses **`electron-updater`** with **GitHub Releases** as the update feed. Once a user has installed the NSIS build (`seec0de Setup x.y.z.exe`), every subsequent launch checks GitHub for a newer version, downloads it in the background, and prompts to restart.

> The portable `.exe` cannot self-update — it has no install location to write to. Users must be on the NSIS installer build for auto-update to work.

### One-time setup

1. **Create a GitHub Personal Access Token** with `repo` scope (classic token) at https://github.com/settings/tokens.
2. Expose it to the build shell as `GH_TOKEN` (electron-builder reads this automatically):

   ```powershell
   $env:GH_TOKEN = "ghp_xxx..."
   ```

   Add it to your user environment variables to avoid setting it every session.

### The release workflow

Every time you want to ship a code change to installed users:

```powershell
# 1. Make your code changes & commit them
git add .
git commit -m "fix: whatever you changed"

# 2. Bump the version (semver — patch / minor / major)
npm version patch        # 1.0.0 -> 1.0.1
# or: npm version minor  # 1.0.0 -> 1.1.0
# or: npm version major  # 1.0.0 -> 2.0.0

# 3. Build & publish to GitHub Releases
npm run release:win

# 4. Push the version-bump commit & tag
git push --follow-tags
```

`npm run release:win` runs `electron-builder --win --publish always`, which:

1. Builds the renderer & packages the app.
2. Creates (or reuses) a **draft release** on GitHub tagged `v<version>`.
3. Uploads `seec0de Setup <version>.exe`, `latest.yml`, and the `.blockmap` files.

After the script finishes, open the draft release on GitHub and click **Publish release**. As soon as it's published, every running copy of seec0de will pick it up on its next launch.

### How the client-side update flow works

`src/main/main.js` calls `autoUpdater.checkForUpdatesAndNotify()` after the window is created (production builds only). The flow:

```
launch → check latest.yml on GitHub
       → if newer version: download in background (delta via blockmap when possible)
       → on download complete: dialog "Restart now / Later"
       → "Restart now" → autoUpdater.quitAndInstall()
```

Update logs land in `%APPDATA%\seec0de\logs\main.log` on the user's machine — useful for debugging "did the update actually run?".

### Delta updates

electron-builder writes a `.blockmap` next to each installer. When a user already has version N installed and version N+1 ships, the updater downloads only the changed blocks instead of the full ~90 MB installer. No extra config required — it works automatically as long as you publish the `.blockmap` files (which `--publish always` does).

### Quick sanity check before shipping

1. `npm run dist:win` (no publish) and install the resulting `.exe` locally.
2. Bump the version, run `npm run release:win`, publish the draft on GitHub.
3. Re-launch the locally-installed app. Within ~30 seconds you should see the "update ready" dialog.

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| `HttpError: 404` on publish | `GH_TOKEN` missing or lacks `repo` scope. |
| Installed app never sees the update | You forgot to **publish** the draft release on GitHub. |
| `Error: Could not find latest.yml` in `main.log` | Release was published but `latest.yml` wasn't uploaded — re-run `release:win`. |
| Update detected but install fails | App was launched from a path it can't write to (e.g. portable build). Use the NSIS installer. |
| `repository` field warning from electron-builder | Optional, but you can add `"repository": "https://github.com/Emmanuel-PaulMaah/seec0de"` to `package.json` to silence it. |
