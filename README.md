# ⟨/⟩ SEEC0DE

**Write natural instructions, see pseudocode & code. Paste code, see explanations.**

Seec0de is a desktop learning tool built for people who want to understand programming — not just copy it. Type what you want in plain English and instantly see pseudocode and real code side by side in up to 8 languages. Or paste existing code and get a plain-language breakdown of every line. Every keyword is highlighted and linked to a built-in glossary so you can learn as you go.

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

## How It Works

Seec0de has two modes, toggled by the tab bar at the top of the window.

### Mode 1: ⟨/⟩ Code

You describe what you want in natural language. Seec0de generates pseudocode and real, working code in every language you've selected.

**Steps:**
1. Pick your languages using the chip buttons in the left panel (Python, JavaScript, Java, C++, C#, Go, Rust, TypeScript).
2. Type an instruction in the text area. For example: *"sort a list of numbers"*, *"create a class with inheritance"*, or *"read a file and process each line"*.
3. Click **Generate** for instant offline generation, or **✨ AI Generate** to use Google Gemini for production-quality AI-generated code.
4. The center panel shows tabbed editors — one for **Pseudocode** and one for each selected language — all with full syntax highlighting via Monaco Editor (the same editor engine that powers VS Code).

**AI Generation** requires a free API key from [Google AI Studio](https://aistudio.google.com). Click "AI Settings" in the left panel to add your key.

**What instructions are recognized:**

| You type something about… | What you get |
|---|---|
| `hello world`, `print`, `greet` | Hello world program with a greet function |
| `sort`, `order`, `arrange` | Bubble sort with optimized early-exit |
| `loop`, `iterate`, `repeat`, `for each` | Count-based, collection-based, and while loops |
| `function`, `method`, `define` | Area calculator with multiple shape functions |
| `class`, `object`, `inheritance` | Animal → Dog class hierarchy with methods |
| `file`, `read file`, `write file` | File read, line processing, and write operations |
| `array`, `list`, `collection`, `map` | Filter, map, reduce, find operations |
| `api`, `http`, `fetch`, `request` | GET and POST HTTP requests with error handling |
| `calculate`, `math`, `factorial` | Factorial, Fibonacci, and statistics functions |

Anything else generates a skeleton with your instruction as a comment.

### Mode 2: 📖 Explain

You paste code you've found or written and get a plain-English explanation of how it works.

**Steps:**
1. Switch to the **📖 Explain** tab.
2. Select the language from the dropdown.
3. Paste or type code into the editor.
4. **Select any portion of code** with your mouse — floating **"Explain"** and **"✨ AI Explain"** buttons appear.
5. Click **Explain** for instant offline analysis, or **✨ AI Explain** for a detailed AI-powered breakdown. The right sidebar shows:
   - A **summary** of what the code does overall (detects classes, functions, loops, conditionals, imports).
   - A **line-by-line breakdown** — every line gets a plain English explanation of its purpose, what the syntax means, and how it fits together.

### Keyword Glossary

Click any highlighted keyword in the code to see its glossary entry in the sidebar:
- **Definition** — what the keyword does in that specific language.
- **Example** — a short, runnable code snippet showing it in use.

The glossary covers 15–20 keywords per language including variable declarations, control flow, functions, classes, imports, error handling, and language-specific features (e.g. Rust's `match`, Go's `defer`, Python's `with`).

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
