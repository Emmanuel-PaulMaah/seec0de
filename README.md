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

seec0de has two modes — switch between them with the tabs at the top.

### ⟨/⟩ code mode — describe it, see it

1. pick the languages you care about (python, javascript, java, c++, c#, go, rust, typescript).
2. type what you want in plain english. examples:
   - *"sort a list of numbers"*
   - *"create a class with inheritance"*
   - *"read a file & process each line"*
3. hit **generate** for an instant offline result, or **✨ ai generate** for a polished ai-written version.
4. flip through the tabs to see pseudocode & each language side by side, all with proper syntax colouring.

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

### 📖 explain mode — paste it, understand it

1. switch to the **📖 explain** tab.
2. choose the language from the dropdown.
3. paste or type code into the editor.
4. **highlight any chunk of code** with your mouse — floating **explain** & **✨ ai explain** buttons appear.
5. click one. the right sidebar shows:
   - a short **summary** of what the code does overall.
   - a **line-by-line breakdown** in plain english.

### keyword glossary

click any highlighted keyword in the code to see:
- a clear **definition** for that language
- a tiny **example** showing it in use

covers 15–20 keywords per language, including the language-specific ones (rust's `match`, go's `defer`, python's `with`, & more).

---

## supported languages

python · javascript · java · c++ · c# · go · rust · typescript

---

## who it's for

- students learning their first language
- developers picking up a new language & wanting to see familiar concepts in unfamiliar syntax
- anyone who finds a snippet online & wants to know what it actually does

---

for technical details, architecture, & how to extend seec0de, see [dev-doc.md](dev-doc.md).
