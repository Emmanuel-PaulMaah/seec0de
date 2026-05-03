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
