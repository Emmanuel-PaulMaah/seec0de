# ⟨/⟩ seec0de

**write natural instructions, see pseudocode & code. select code, see explanations. run it. all in one window.**

seec0de is a desktop learning tool for people who want to understand programming — not just copy it. type what you want in plain english & instantly see pseudocode & real code side by side in up to 8 languages. select any chunk of code & get a plain-language breakdown of every line. run javascript, typescript, python, c & c++ right inside the app. every keyword is highlighted & linked to a built-in glossary so you can learn as you go.

---

## quick start

```bash
npm install
npm run dev
```

that's it. the app opens in its own window.

---

## what you can do

one workspace, up to five columns: **file explorer · instruction · code · live preview · explanation**, with an explained terminal docked at the bottom. each side panel can be collapsed to a 32 px rail so the editor + preview can claim the screen when you want them to.

### ⟨/⟩ describe → see code

1. during onboarding, pick the language you actually want to build in (your "practical language") + a couple of comparison languages. you can change these any time from **Settings → Languages**.
2. type what you want in plain english, or tap one of the suggestion chips (**Try one of these**, click 🔀 to shuffle) — examples:
   - *"sort a list of numbers"*
   - *"fizzbuzz from 1 to 20"*
   - *"check if a word is a palindrome"*
   - *"read a csv of student grades & print the top 5 averages"*
3. hit **Generate**. *one button.* if you've added a free [Google AI Studio](https://aistudio.google.com) gemini key in **Settings → AI** and you're online, it'll use the AI for a polished, real-world answer. if not (or if the AI call fails), it silently falls back to the built-in offline template generator so you always get something runnable. no "which button do i click?" moment.
4. flip through the tabs in the middle panel to see pseudocode + each language side by side, all with proper syntax colouring. the pseudocode tab is the lesson — every language tab is the same idea in different syntax.
5. **with a folder open**, Generate writes the result straight to a real `scratch-1.py` / `scratch-2.js` / … file in your folder and opens it as a tab. no in-memory tabs competing with on-disk files.

things seec0de's offline generator recognises out of the box (no API key needed):

| if you mention… | you get |
|---|---|
| hello world, print, greet | a hello world program |
| fizzbuzz | the classic 1-to-N fizzbuzz |
| palindrome | a palindrome check |
| prime, sieve | a prime sieve up to N |
| reverse | reverse a string |
| word count, frequency | a word-frequency counter |
| sort, order, arrange | a sorting routine |
| loop, iterate, repeat | different kinds of loops |
| function, method, define | example functions |
| class, object, inheritance | a class hierarchy |
| file, read file, write file | file reading & writing |
| array, list, collection, map | filter / map / reduce examples |
| api, http, fetch, request | HTTP requests with error handling |
| factorial, fibonacci | math routines |

anything else gives you a clean skeleton with your instruction as a comment.

### ▶ Run — execute it where it lives

the **Run** button in the editor toolbar compiles + executes the active code in a sandboxed temp directory & pushes the result into the **Console** tab of the Live Preview panel. supports javascript (node), typescript (tsx / ts-node), python, c (gcc/clang/cl), c++. missing toolchains return a one-line install hint instead of crashing; **Settings → Toolchains** probes your PATH on open and gives you a one-click install for whichever languages you're missing.

> **Console is Run-only.** typing into the editor does not produce console entries. Run is the single, explicit gesture that produces output — same model for every language including javascript.

### 🌐 Live Preview — html renders as you type

the right-side **Live Preview** panel renders **HTML** live into a sandboxed iframe with a ~250ms debounce. every other previewable language (JS, Python, C, C++) shows a "press Run, see output in Console" placeholder so output is always a deliberate gesture. CSS pairs with HTML — open an `.html` file that links to your stylesheet & watch it apply.

### 🔍 select code → see explanations

select any chunk of code in the editor & a floating **Explain** button appears. click it & a line-by-line breakdown lands in the right-side **Explanation** panel.

**single Explain button**, same auto-fallback as Generate: when you're online + have an API key, it uses the AI for a contextual explanation that references your actual function & variable names. otherwise it falls back to the built-in glossary explainer. you don't have to decide.

the line-by-line breakdown is a **single-open accordion** — every line starts collapsed; click one to expand it, & whichever line was previously open auto-closes. lets you focus on one line at a time instead of getting hit with the whole explanation at once.

### 🩹 errors get translated

when Run fails, the **Console** tab stacks a small "what does that mean?" card above the raw stderr — title, plain-english explanation, and 2–5 concrete fixes that reference your actual variable/function names. covers the common beginner errors offline (regex-matched against the stderr you actually hit, no AI needed) across python, javascript, typescript, c, and c++. anything the offline translator doesn't recognise falls through to an **AI-translated** card with the same shape (small "AI" badge so you know the source), when you have a key + connection. the raw stderr stays visible underneath either way.

### 🎓 lessons mode

the instruction panel has a **Build / Lessons** tab strip. *Build* is the existing "write what you want" surface. *Lessons* opens a curated track of starter exercises — pick one, the instruction fills in, an active-lesson card shows the goal + exercise, and the lesson marks itself complete the first time you Run successfully. completion sticks across launches.

### 🅰 editor font controls

the editor toolbar has `A−` / size / `A+` buttons (and `Ctrl/⌘ +` / `Ctrl/⌘ −` / `Ctrl/⌘ 0` shortcuts) to scale Monaco between 10 px and 28 px. preference persists per-install.

### 🔍 keyword glossary

click any highlighted keyword in the code to see:

- a clear **definition** for that language
- a tiny **example** showing it in use

covers 15–30 keywords per language, including the language-specific ones (rust's `match`, go's `defer`, python's `with`, typescript's `interface` / `keyof` / `readonly`, & more). works in both read-only & editable mode.

### 🗂 file explorer + multi-file editing

toggle the file explorer from the title bar to open any folder. files open as Monaco tabs alongside the pseudocode/language tabs; edits are **auto-saved ~600ms after your last keystroke** so you never have to think about Ctrl+S (it still works if you want it). dirty `•` indicators show the round-trip until the save lands.

### ⌨ explained terminal

bottom-of-window collapsible terminal (`Ctrl + ``) that turns every command into a card with **a one-line explanation, stdout/stderr, exit status, and duration.** built-in explanations cover filesystem builtins, npm / pnpm / yarn, git, docker, node, python, go, cargo, dotnet, and PowerShell `Verb-Noun` cmdlets. `cd` and `clear` are handled client-side so the cwd persists across commands. up/down arrows walk the prompt history (last 50, persisted).

---

## supported languages

**generated:** python · javascript · typescript · java · c++ · c · c# · go · rust
**runnable in-app:** javascript · typescript · python · c · c++
**live-previewable:** html

---

## who it's for

- students learning their first language
- developers picking up a new language & wanting to see familiar concepts in unfamiliar syntax
- anyone who finds a snippet online & wants to know what it actually does

---

## privacy & security

- **API key never touches the renderer.** The Gemini key is stored encrypted at rest in the main process via Electron `safeStorage` (DPAPI on Windows, Keychain on macOS, libsecret on Linux). The HTTPS call to Google also runs from the main process. The renderer only sees a boolean *"is a key set?"*.
- **Child processes (Run, Terminal) get a sanitized environment.** A whitelist of safe variables (`PATH`, `HOME`/`USERPROFILE`, locale, temp dirs) is passed to every spawned tool — secrets in the parent process don't leak into your code or shell commands.
- **Filesystem IPC is scoped to the open folder + OS temp dir** when a project root is set, so an accidental `..` in a path can't wander out of the workspace.

---

## releases & changelog

- installer + portable .exe: [GitHub Releases](https://github.com/Emmanuel-PaulMaah/seec0de/releases)
- detailed release notes: [CHANGELOG.md](CHANGELOG.md)
- auto-update is wired in via `electron-updater` — installed copies pick up new releases on next launch (delta downloads).
