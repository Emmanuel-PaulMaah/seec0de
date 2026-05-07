# ⟨/⟩ seec0de

**write natural instructions, see pseudocode & code. paste code, see explanations.**

seec0de is a desktop learning tool for people who want to understand programming — not just copy it. type what you want in plain english & instantly see pseudocode & real code side by side in up to 8 languages. or paste existing code & get a plain-language breakdown of every line. every keyword is highlighted & linked to a built-in glossary so you can learn as you go.

---

## quick start

```bash
npm install
npm run dev
```

that's it. the app opens in its own window.

---

## what you can do

one workspace, three panels: **instructions on the left, code in the middle, explanations on the right**. no mode switching — everything is on screen at once.

### ⟨/⟩ describe → see code

1. pick the languages you care about (python, javascript, java, c++, c#, go, rust, typescript).
2. type what you want in plain english. examples:
   - *"sort a list of numbers"*
   - *"create a class with inheritance"*
   - *"read a file & process each line"*
3. hit **generate** for an instant offline result, or **ai generate** for a polished ai-written version.
4. flip through the tabs in the middle panel to see pseudocode & each language side by side, all with proper syntax colouring.

**ai generate** uses google gemini & needs a free api key from [google ai studio](https://aistudio.google.com). click "ai settings" in the left panel to add yours.

things seec0de recognises out of the box (no api key needed):

| if you mention… | you get |
|---|---|
| hello world, print, greet | a hello world program |
| sort, order, arrange | a sorting routine |
| loop, iterate, repeat | different kinds of loops |
| function, method, define | example functions |
| class, object, inheritance | a class hierarchy |
| file, read file, write file | file reading & writing |
| array, list, collection, map | filter, map, reduce examples |
| api, http, fetch, request | http requests with error handling |
| calculate, math, factorial | math routines |

anything else gives you a clean skeleton with your instruction as a comment.

### 🔓 read-only ↔ editable — paste your own code

the middle panel has a **lock toggle** in the top-right of the tab bar.

- **read-only** (default): the editor displays the generated code without letting you change it. perfect for studying.
- **editable**: click the lock to unlock. now you can paste or type your own code into any language tab. **highlight any chunk** of code with your mouse — floating **explain** & **ai explain** buttons appear. click one to get a plain-english breakdown in the right sidebar.

flip the lock as often as you like. your edits are kept until the next time you generate.

### 🔍 keyword glossary

click any highlighted keyword in the code to see:
- a clear **definition** for that language
- a tiny **example** showing it in use

covers 15–20 keywords per language, including the language-specific ones (rust's `match`, go's `defer`, python's `with`, & more). works in both read-only & editable mode.

---

## supported languages

python · javascript · java · c++ · c# · go · rust · typescript

---

## who it's for

- students learning their first language
- developers picking up a new language & wanting to see familiar concepts in unfamiliar syntax
- anyone who finds a snippet online & wants to know what it actually does
