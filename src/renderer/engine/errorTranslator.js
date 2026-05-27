// Error Message Translator
// -------------------------------------------------------------------------
// Turns a raw stderr blob from the runner into a plain-English explanation +
// a short list of likely fixes. Pure data + regex lookup; no network, no AI.
//
// The runner service writes the unmodified compiler/interpreter stderr
// straight into LivePreviewPanel's Console tab. That's great for honesty
// (the user sees exactly what their language said) but the messages are
// cryptic: "NameError: name 'x' is not defined", "TypeError: Cannot read
// properties of undefined (reading 'foo')", "error: expected ';' before
// '}' token", and so on. New learners stall here.
//
// `translateError(stderr, language)` returns:
//   { title, plain, fixes: string[] }  // matched
//   null                                 // unknown error — UI hides the card
//
// Coverage philosophy: cover the errors a beginner will hit during their
// first 50 hours with each language. Anything we don't recognise returns
// null so the original stderr still speaks for itself.

const PYTHON_PATTERNS = [
  {
    match: /ModuleNotFoundError:\s+No module named ['"]([^'"]+)['"]/,
    title: (m) => `Python can't find the "${m[1]}" module`,
    plain: (m) =>
      `Your code tried to import "${m[1]}", but Python looked through every install location and didn't find it.`,
    fixes: (m) => [
      `Install it from the terminal: \`pip install ${m[1]}\` (or \`pip3 install ${m[1]}\`).`,
      `Double-check the spelling — module names are case-sensitive.`,
      `If you're using a virtual environment, make sure it's activated before you run.`,
    ],
  },
  {
    match: /ImportError:\s+cannot import name ['"]([^'"]+)['"] from ['"]([^'"]+)['"]/,
    title: (m) => `"${m[1]}" doesn't exist inside "${m[2]}"`,
    plain: (m) =>
      `The module "${m[2]}" loaded fine, but it doesn't expose a name called "${m[1]}".`,
    fixes: (m) => [
      `Open the "${m[2]}" docs and confirm the exact spelling/casing of "${m[1]}".`,
      `Maybe the API moved — try \`from ${m[2]} import *\` in a REPL to list what's available.`,
      `If "${m[2]}" is your own file, make sure "${m[1]}" is defined at the top level.`,
    ],
  },
  {
    match: /NameError:\s+name ['"]([^'"]+)['"] is not defined/,
    title: (m) => `Python doesn't know what "${m[1]}" is`,
    plain: (m) =>
      `You used the name "${m[1]}" before defining it (or it was defined in a different scope/file).`,
    fixes: (m) => [
      `Check the spelling — Python is case-sensitive (\`Print\` ≠ \`print\`).`,
      `Make sure the line that defines "${m[1]}" runs before this line.`,
      `If "${m[1]}" lives in another module, add \`import ${m[1]}\` or \`from … import ${m[1]}\` at the top.`,
    ],
  },
  {
    match: /TypeError:\s+unsupported operand type\(s\) for ([^:]+):\s+['"]([^'"]+)['"] and ['"]([^'"]+)['"]/,
    title: (m) => `Can't use ${m[1].trim()} between a ${m[2]} and a ${m[3]}`,
    plain: (m) =>
      `Python won't let you combine a \`${m[2]}\` and a \`${m[3]}\` with \`${m[1].trim()}\` — the types don't line up.`,
    fixes: (m) => [
      `Convert one side first, e.g. \`str(x)\`, \`int(x)\`, or \`float(x)\`.`,
      `If you meant to join strings, wrap numbers with \`str(...)\` before \`+\`.`,
      `If you meant to add numbers, wrap strings with \`int(...)\` or \`float(...)\`.`,
    ],
  },
  {
    match: /TypeError:\s+([^\n]*takes\s+\d+\s+positional argument[^\n]*)/,
    title: () => `Wrong number of arguments`,
    plain: (m) => `${m[1].trim()} — the call site is passing a different number of arguments than the function expects.`,
    fixes: () => [
      `Open the function definition and count the parameters (\`def name(a, b, c):\`).`,
      `Match the call to that count — add a missing argument or remove an extra one.`,
      `Remember that calling a method on an instance counts \`self\` automatically; on a class it doesn't.`,
    ],
  },
  {
    match: /TypeError:\s+([^\n]*missing\s+\d+\s+required positional argument[^\n]*)/,
    title: () => `You forgot to pass an argument`,
    plain: (m) => `${m[1].trim()} — the function requires more arguments than you supplied.`,
    fixes: () => [
      `Pass the missing argument(s) when calling the function.`,
      `If the argument has a sensible default, add \`name=default\` to the function definition.`,
    ],
  },
  {
    match: /ValueError:\s+invalid literal for int\(\) with base \d+:\s+['"]([^'"]*)['"]/,
    title: (m) => `"${m[1]}" isn't a whole number`,
    plain: (m) =>
      `You called \`int(...)\` on "${m[1]}", but that string can't be parsed as an integer.`,
    fixes: () => [
      `If the value has a decimal point, use \`float(x)\` first then \`int(...)\` if you really need to truncate.`,
      `Strip whitespace/punctuation: \`int(x.strip())\`.`,
      `Validate user input before converting — wrap in \`try: ... except ValueError:\`.`,
    ],
  },
  {
    match: /IndexError:\s+list index out of range/,
    title: () => `That index doesn't exist in the list`,
    plain: () =>
      `You asked for an element at a position past the end of the list (or used a negative index that's too big).`,
    fixes: () => [
      `Print \`len(your_list)\` right before the indexing line to see how many items there actually are.`,
      `Remember Python lists are 0-indexed — the last item of an N-item list is at index \`N-1\`.`,
      `Guard the access: \`if i < len(your_list): ...\`.`,
    ],
  },
  {
    match: /KeyError:\s+['"]?([^'"\n]+)['"]?/,
    title: (m) => `The dictionary has no key "${m[1]}"`,
    plain: (m) =>
      `You looked up \`d["${m[1]}"]\` but "${m[1]}" isn't one of the keys in that dictionary.`,
    fixes: (m) => [
      `Print the dict's keys first: \`print(your_dict.keys())\`.`,
      `Use \`.get("${m[1]}")\` to fall back to \`None\` instead of crashing.`,
      `Or use \`if "${m[1]}" in your_dict: ...\` before reading.`,
    ],
  },
  {
    match: /AttributeError:\s+['"]?([^'"\s]+)['"]? object has no attribute ['"]([^'"]+)['"]/,
    title: (m) => `A "${m[1]}" doesn't have a "${m[2]}" attribute`,
    plain: (m) =>
      `You called \`.${m[2]}\` on something Python sees as a \`${m[1]}\`, which doesn't define that name.`,
    fixes: (m) => [
      `Print the object with \`print(type(x))\` to see what it really is — it may not be the type you think.`,
      `Check spelling: \`.${m[2]}\` vs \`.${m[2].toLowerCase()}\` vs \`.${m[2]}_\`.`,
      `If "${m[2]}" should exist, make sure the constructor that defines it actually ran.`,
    ],
  },
  {
    match: /ZeroDivisionError/,
    title: () => `You divided by zero`,
    plain: () =>
      `Math doesn't allow dividing (or taking modulo) by 0, so Python aborted the operation.`,
    fixes: () => [
      `Guard the divisor: \`if d != 0: result = n / d\`.`,
      `If 0 is a valid input, decide what your code should return in that case (often \`None\` or \`float('inf')\`).`,
    ],
  },
  {
    match: /FileNotFoundError:\s+\[Errno \d+\][^:]*:\s+['"]([^'"]+)['"]/,
    title: (m) => `The file "${m[1]}" doesn't exist`,
    plain: (m) =>
      `Python looked for "${m[1]}" and couldn't find it. Paths are resolved relative to the **current working directory**, not the script's folder.`,
    fixes: (m) => [
      `Print \`os.getcwd()\` to see where Python is actually looking.`,
      `Use an absolute path, or build one from the script: \`os.path.join(os.path.dirname(__file__), "${m[1]}")\`.`,
      `Double-check capitalisation and extensions (\`.txt\` vs \`.TXT\`).`,
    ],
  },
  {
    match: /RecursionError:\s+maximum recursion depth exceeded/,
    title: () => `Your function called itself too many times`,
    plain: () =>
      `A recursive function kept calling itself without ever hitting a stopping condition (base case), so Python stopped it.`,
    fixes: () => [
      `Add a base case at the top of the function: \`if n <= 0: return ...\`.`,
      `Make sure each recursive call moves *closer* to the base case.`,
      `For very deep iteration, rewrite as a \`while\`/\`for\` loop instead.`,
    ],
  },
  {
    match: /IndentationError:\s+expected an indented block/,
    title: () => `Python expected an indented block here`,
    plain: () =>
      `Right after \`if\`, \`for\`, \`while\`, \`def\`, or \`class\`, the next line has to be indented — Python uses indentation instead of braces.`,
    fixes: () => [
      `Indent the body of the block by 4 spaces (or one tab, but stay consistent).`,
      `If you don't have a body yet, write \`pass\` as a placeholder.`,
    ],
  },
  {
    match: /IndentationError:\s+unexpected indent/,
    title: () => `This line is indented but shouldn't be`,
    plain: () =>
      `Python found an indented line where it expected a top-level (or less-indented) one — there's no \`if\`/\`for\`/\`def\` etc. above it to belong to.`,
    fixes: () => [
      `Remove the leading spaces/tabs so it lines up with the surrounding code.`,
      `Don't mix tabs and spaces — pick one and stick with it (most editors will convert for you).`,
    ],
  },
  {
    match: /IndentationError:\s+unindent does not match any outer indentation level/,
    title: () => `The indentation doesn't line up with any block above`,
    plain: () =>
      `You de-indented to a level that no enclosing block uses, so Python can't tell where this line belongs.`,
    fixes: () => [
      `Re-indent the line to match a block above it exactly.`,
      `Most editors have "convert indentation to spaces" — run it to normalise mixed tabs/spaces.`,
    ],
  },
  {
    match: /SyntaxError:\s+invalid syntax/,
    title: () => `Python can't parse this line`,
    plain: () =>
      `Somewhere on (or just before) this line, the code isn't valid Python — usually a missing \`:\`, an unbalanced bracket, or a stray keyword.`,
    fixes: () => [
      `Look at the caret (\`^\`) in the error — it points at the first character Python couldn't make sense of.`,
      `Make sure \`if\`, \`for\`, \`while\`, \`def\`, \`class\` lines end with a colon.`,
      `Count brackets/quotes — every \`(\`, \`[\`, \`{\`, \`"\`, \`'\` needs a partner.`,
    ],
  },
  {
    match: /SyntaxError:\s+EOL while scanning string literal/,
    title: () => `You forgot to close a string`,
    plain: () =>
      `Python reached the end of the line still inside a string — a \`"\` or \`'\` was never closed.`,
    fixes: () => [
      `Add the matching closing quote at the end of the string.`,
      `For strings that span multiple lines, use triple quotes: \`"""..."""\` or \`'''...'''\`.`,
    ],
  },
];

const JS_PATTERNS = [
  {
    match: /Error:\s+Cannot find module ['"]([^'"]+)['"]/,
    title: (m) => `Node can't find the "${m[1]}" module`,
    plain: (m) =>
      `Your code did \`require("${m[1]}")\` or \`import ... from "${m[1]}"\` but Node couldn't locate it.`,
    fixes: (m) => [
      `Install it: \`npm install ${m[1]}\`.`,
      `If it's a local file, make sure the path is right and starts with \`./\` (e.g. \`require("./${m[1]}")\`).`,
      `Verify your \`node_modules\` folder exists — run \`npm install\` from the project root if not.`,
    ],
  },
  {
    match: /ReferenceError:\s+(\w+) is not defined/,
    title: (m) => `JavaScript doesn't know what "${m[1]}" is`,
    plain: (m) =>
      `You used the name "${m[1]}" but it was never declared with \`let\`, \`const\`, \`var\`, \`function\`, or imported from a module.`,
    fixes: (m) => [
      `Check the spelling — JavaScript is case-sensitive.`,
      `Declare it first: \`const ${m[1]} = ...\`.`,
      `If it comes from another file, add an \`import\` at the top.`,
    ],
  },
  {
    // Two V8 formats:
    //   old (Node ≤ 15):  TypeError: Cannot read property 'foo' of undefined
    //   new (Node 16+):   TypeError: Cannot read properties of undefined (reading 'foo')
    match: /TypeError:\s+Cannot read propert(?:y|ies)(?:\s+['"]([^'"]+)['"]\s+of\s+(undefined|null)|\s+of\s+(undefined|null)\s+\(reading\s+['"]([^'"]+)['"]\))/,
    title: (m) => {
      const prop = m[1] || m[4];
      const target = m[2] || m[3];
      return `Tried to read ".${prop}" on ${target}`;
    },
    plain: (m) => {
      const prop = m[1] || m[4];
      const target = m[2] || m[3];
      return `Something you expected to be an object is actually \`${target}\`, so reading \`.${prop}\` from it crashes.`;
    },
    fixes: (m) => {
      const prop = m[1] || m[4];
      return [
        `\`console.log\` the value just before this line to see what it actually is.`,
        `Add a guard: \`if (x) { x.${prop} }\` or use optional chaining: \`x?.${prop}\`.`,
        `If it's from an async call, make sure you \`await\`-ed it (otherwise you have a Promise, not the value).`,
      ];
    },
  },
  {
    match: /TypeError:\s+(\w+(?:\.\w+)*) is not a function/,
    title: (m) => `"${m[1]}" isn't a function`,
    plain: (m) =>
      `You called \`${m[1]}(...)\` but \`${m[1]}\` is something else (undefined, a string, a number, an object…).`,
    fixes: (m) => [
      `\`console.log(typeof ${m[1]})\` just before the call — it'll usually say \`"undefined"\` or \`"object"\`.`,
      `Check the import: did you mean a named import (\`{ ${m[1]} }\`) instead of a default one (or vice versa)?`,
      `If it's a method, make sure the variable holds the type you think (array? object? class instance?).`,
    ],
  },
  {
    match: /SyntaxError:\s+Unexpected token/,
    title: () => `Unexpected character or keyword`,
    plain: () =>
      `JavaScript hit something where it wasn't allowed — usually an extra comma, a missing bracket, or using a keyword (\`await\`, \`return\`) outside of where it's valid.`,
    fixes: () => [
      `Look at the line + column in the error — that's where the parser gave up.`,
      `Count brackets/parens/braces — every opener needs a closer.`,
      `\`await\` only works inside an \`async function\` (or at the top level of an ES module).`,
    ],
  },
  {
    match: /SyntaxError:\s+Unexpected end of input/,
    title: () => `The file ended in the middle of something`,
    plain: () =>
      `JavaScript reached the end of the file but was still waiting for a closing \`}\`, \`)\`, or \`]\`.`,
    fixes: () => [
      `Scroll to the end and count braces — every \`{\` needs a matching \`}\`.`,
      `Most editors highlight the matching bracket when you put your cursor on one. Use it.`,
    ],
  },
  {
    match: /RangeError:\s+Maximum call stack size exceeded/,
    title: () => `Too much recursion — the call stack overflowed`,
    plain: () =>
      `A function kept calling itself without ever returning, so the engine ran out of stack space.`,
    fixes: () => [
      `Add a base case that returns *without* recursing — most recursion bugs are missing or wrong base cases.`,
      `Verify each recursive call moves toward the base case (e.g. \`n - 1\`, not \`n\`).`,
      `For very deep work, convert to a \`while\` loop or use an explicit stack.`,
    ],
  },
  {
    match: /SyntaxError:\s+Identifier ['"]?(\w+)['"]? has already been declared/,
    title: (m) => `"${m[1]}" was declared twice`,
    plain: (m) =>
      `You used \`let\` or \`const\` to declare \`${m[1]}\` in the same scope where it already exists.`,
    fixes: (m) => [
      `Remove one of the declarations — reassign instead: \`${m[1]} = newValue\`.`,
      `If you meant a new variable, rename it.`,
    ],
  },
];

const TS_PATTERNS = [
  {
    match: /error TS2304:\s+Cannot find name ['"]([^'"]+)['"]/,
    title: (m) => `TypeScript doesn't know the name "${m[1]}"`,
    plain: (m) =>
      `"${m[1]}" hasn't been declared anywhere in scope — it's not a variable, function, or imported symbol TypeScript can see.`,
    fixes: (m) => [
      `Declare it: \`const ${m[1]} = ...\`.`,
      `Import it from the module that exports it.`,
      `If it's a global from a library (like \`process\` or \`describe\`), install its types: \`npm i -D @types/node\` or similar.`,
    ],
  },
  {
    match: /error TS2322:\s+Type ['"]([^'"]+)['"] is not assignable to type ['"]([^'"]+)['"]/,
    title: (m) => `A ${m[1]} doesn't fit where a ${m[2]} is expected`,
    plain: (m) =>
      `You're assigning a value of type \`${m[1]}\` to a slot typed as \`${m[2]}\`. The shapes don't match.`,
    fixes: (m) => [
      `Convert the value to the expected type (e.g. \`String(x)\`, \`Number(x)\`).`,
      `Widen the target type (e.g. \`${m[2]} | ${m[1]}\`) if both should be allowed.`,
      `If you're sure it's safe, cast with \`as ${m[2]}\` — but only as a last resort.`,
    ],
  },
  {
    match: /error TS2339:\s+Property ['"]([^'"]+)['"] does not exist on type ['"]([^'"]+)['"]/,
    title: (m) => `"${m[1]}" isn't a property of ${m[2]}`,
    plain: (m) =>
      `You wrote \`.${m[1]}\` on a value typed as \`${m[2]}\`, but that type doesn't declare \`${m[1]}\`.`,
    fixes: (m) => [
      `Check spelling — TypeScript is case-sensitive.`,
      `If "${m[1]}" really exists, the type may be too narrow — widen the interface or cast: \`(x as any).${m[1]}\` (sparingly).`,
      `Use optional chaining if it might be missing: \`x?.${m[1]}\`.`,
    ],
  },
  {
    match: /error TS2345:\s+Argument of type ['"]([^'"]+)['"] is not assignable to parameter of type ['"]([^'"]+)['"]/,
    title: (m) => `You passed a ${m[1]} but the function wants a ${m[2]}`,
    plain: (m) =>
      `The function's parameter is typed \`${m[2]}\`, but you supplied a \`${m[1]}\` — TypeScript blocks the call because they don't match.`,
    fixes: (m) => [
      `Convert your argument to \`${m[2]}\` before passing it.`,
      `Or change the function signature to accept \`${m[1]}\` if that's the real requirement.`,
    ],
  },
  {
    match: /error TS2531:\s+Object is possibly ['"]?null['"]?/,
    title: () => `This value could be null`,
    plain: () =>
      `TypeScript can see this expression might be \`null\` at runtime, so it won't let you use it directly.`,
    fixes: () => [
      `Guard it: \`if (x !== null) { ... }\`.`,
      `Use optional chaining: \`x?.prop\`.`,
      `If you're certain it's non-null at this point, use the non-null assertion: \`x!\` (sparingly).`,
    ],
  },
  {
    match: /error TS2532:\s+Object is possibly ['"]?undefined['"]?/,
    title: () => `This value could be undefined`,
    plain: () =>
      `TypeScript can see this expression might be \`undefined\` at runtime, so it won't let you use it directly.`,
    fixes: () => [
      `Guard it: \`if (x !== undefined) { ... }\`.`,
      `Use optional chaining + nullish coalescing: \`x?.prop ?? fallback\`.`,
      `If you're certain it's defined here, use the non-null assertion: \`x!\`.`,
    ],
  },
];

const C_PATTERNS = [
  {
    match: /error:\s+['"]?([^'"\s]+)['"]?\s+undeclared\b/,
    title: (m) => `"${m[1]}" wasn't declared`,
    plain: (m) =>
      `The compiler hit \`${m[1]}\` but there's no \`int ${m[1]}\`, \`#define ${m[1]}\`, or matching declaration in scope.`,
    fixes: (m) => [
      `Declare it before use: \`int ${m[1]} = 0;\`.`,
      `If "${m[1]}" comes from a standard library (like \`printf\`), \`#include\` its header (\`<stdio.h>\`, \`<string.h>\`, \`<stdlib.h>\`…).`,
      `Check spelling — C is case-sensitive.`,
    ],
  },
  {
    match: /(?:error|warning):\s+implicit declaration of function ['"]?([^'"\s)]+)['"]?/,
    title: (m) => `Called "${m[1]}" without declaring it first`,
    plain: (m) =>
      `In C, you must declare a function (or include its header) before you call it. The compiler is guessing the signature and warns you.`,
    fixes: (m) => [
      `Add the right \`#include\` at the top — e.g. \`#include <stdio.h>\` for \`printf\`/\`scanf\`, \`<stdlib.h>\` for \`malloc\`/\`free\`, \`<string.h>\` for \`strcpy\`/\`strlen\`.`,
      `If "${m[1]}" is your own function, move its definition above \`main\` or add a prototype near the top.`,
    ],
  },
  {
    match: /error:\s+expected ['"];['"]?\s+before/,
    title: () => `Missing semicolon`,
    plain: () =>
      `The compiler expected a \`;\` to end the previous statement but found something else.`,
    fixes: () => [
      `Add a \`;\` at the end of the previous line.`,
      `Don't put \`;\` after \`if (...)\`, \`while (...)\`, or function headers — that creates an empty statement and usually triggers cascading errors.`,
    ],
  },
  {
    match: /undefined reference to ['"`]?([^'"`\s]+)['"`]?/,
    title: (m) => `Linker can't find "${m[1]}"`,
    plain: (m) =>
      `The code compiled fine, but at link time the linker couldn't find a definition for "${m[1]}" — only a declaration.`,
    fixes: (m) => [
      `If "${m[1]}" lives in another \`.c\` file, add that file to the compile command (\`gcc main.c other.c\`).`,
      `If it's from a library, link it explicitly (\`-lm\` for math, \`-lpthread\` for threads, etc.).`,
      `Make sure the function name + signature actually match where it's defined.`,
    ],
  },
  {
    match: /error:\s+expected expression/,
    title: () => `Expected an expression here`,
    plain: () =>
      `Where the compiler reached, it needed something that produces a value (like \`x + 1\` or a literal), but the syntax doesn't form one.`,
    fixes: () => [
      `Look at the line above too — a missing \`;\` or unbalanced bracket on the previous line often shows up here.`,
      `Make sure operators have both operands: \`x = ;\` is invalid; \`x = 0;\` is fine.`,
    ],
  },
  {
    match: /error:\s+expected ['"`]\}['"`]?\s+at end of input/,
    title: () => `Missing closing brace`,
    plain: () =>
      `The file ended while the compiler was still waiting for a closing \`}\`.`,
    fixes: () => [
      `Count your \`{\` and \`}\` — they must balance.`,
      `If your editor matches braces on cursor placement, use it to find the unmatched opener.`,
    ],
  },
  {
    match: /error:\s+stray ['"`]([^'"`]+)['"`]/,
    title: (m) => `Stray "${m[1]}" character in code`,
    plain: (m) =>
      `The compiler found a "${m[1]}" character it can't make sense of — often a "smart quote" pasted from a document or a non-ASCII character.`,
    fixes: () => [
      `Retype the line in your editor — pasting from Word/Google Docs often introduces curly quotes (\`"\`, \`"\`) that look like \`"\` but aren't.`,
      `Make sure you saved the file as UTF-8 without weird BOM artefacts.`,
    ],
  },
  {
    match: /Segmentation fault/i,
    title: () => `Segmentation fault — your program touched memory it shouldn't have`,
    plain: () =>
      `The OS killed the program because it tried to read or write a memory address it doesn't own — usually a null/uninitialised pointer or an out-of-bounds array index.`,
    fixes: () => [
      `Initialise every pointer before using it: \`int *p = NULL;\` then check \`if (p != NULL)\`.`,
      `Bounds-check array access — \`a[i]\` for \`i >= length\` is undefined behaviour.`,
      `Avoid dereferencing the return of \`malloc\` without checking for \`NULL\`.`,
      `Compile with \`-g -fsanitize=address\` (with gcc/clang) to get a stack trace pinpointing the bad access.`,
    ],
  },
];

const CPP_EXTRA_PATTERNS = [
  {
    match: /error:\s+['"]?([^'"\s]+)['"]?\s+was not declared in this scope/,
    title: (m) => `"${m[1]}" isn't declared in this scope`,
    plain: (m) =>
      `The compiler can't see a declaration for \`${m[1]}\` — it's either misspelled, defined in another file, or its header isn't included.`,
    fixes: (m) => [
      `If "${m[1]}" is in the standard library, \`#include\` the right header (\`<iostream>\`, \`<vector>\`, \`<string>\`, \`<algorithm>\`…).`,
      `Add \`using namespace std;\` (small programs) or qualify with \`std::${m[1]}\` (cleaner).`,
      `Check spelling and that the declaration appears *before* this line.`,
    ],
  },
  {
    match: /error:\s+no matching function for call to ['"`]?([^'"`(]+)\(/,
    title: (m) => `No overload of "${m[1]}" matches these arguments`,
    plain: (m) =>
      `You called \`${m[1]}(...)\` but none of its overloads take the exact types you passed.`,
    fixes: () => [
      `Read the "candidate" lines below the error — they show what overloads exist and what types they expect.`,
      `Convert your arguments to the expected types (e.g. \`std::string(x)\`, \`static_cast<int>(x)\`).`,
    ],
  },
];

const PATTERNS = {
  python:     PYTHON_PATTERNS,
  javascript: JS_PATTERNS,
  typescript: [...TS_PATTERNS, ...JS_PATTERNS], // TS errors fall back to JS runtime errors
  c:          C_PATTERNS,
  cpp:        [...CPP_EXTRA_PATTERNS, ...C_PATTERNS], // C++ inherits C messages
};

// -------------------------------------------------------------------------
// Public API

/**
 * Translate every recognised error inside a stderr blob into learner-friendly
 * explanations, ordered by where they appear in the output.
 *
 * Compilers and chained-exception runtimes commonly emit several distinct
 * errors in a single run (e.g. gcc reports every syntax error it sees,
 * Python's "During handling of the above exception, another exception
 * occurred" pattern stacks tracebacks). Returning just the first match
 * silently hides the rest — exactly the "subsequent errors are ignored"
 * bug. We scan all patterns globally, sort by position, and de-duplicate
 * overlapping matches so the caller can render one card per real error.
 *
 * @param {string} stderr   Raw stderr from the runner.
 * @param {string} language One of: python, javascript, typescript, c, cpp.
 * @returns {Array<{ title: string, plain: string, fixes: string[] }>}
 *          Empty array when nothing matches.
 */
export function translateError(stderr, language) {
  if (!stderr || typeof stderr !== 'string') return [];
  const lang = (language || '').toLowerCase();
  const patterns = PATTERNS[lang];
  if (!patterns || patterns.length === 0) return [];

  // 1. Collect every (pattern × hit) across the stderr blob.
  const found = [];
  for (const p of patterns) {
    const flags = p.match.flags.includes('g') ? p.match.flags : p.match.flags + 'g';
    const re = new RegExp(p.match.source, flags);
    let m;
    while ((m = re.exec(stderr)) !== null) {
      found.push({
        index: m.index,
        end:   m.index + m[0].length,
        title: typeof p.title === 'function' ? p.title(m) : p.title,
        plain: typeof p.plain === 'function' ? p.plain(m) : p.plain,
        fixes: typeof p.fixes === 'function' ? p.fixes(m) : (p.fixes || []),
      });
      // Defensive: a zero-length match would loop forever.
      if (re.lastIndex === m.index) re.lastIndex++;
    }
  }
  if (found.length === 0) return [];

  // 2. Order by position so the cards mirror the stderr's reading order.
  found.sort((a, b) => a.index - b.index);

  // 3. De-duplicate overlapping matches. When two patterns both fire on
  // the same chunk of text (e.g. a generic + a specific catcher), keep
  // the earlier one and skip anything that starts before the previous
  // match ended. Also de-dupe identical titles (the same line of stderr
  // can be matched by multiple regex variants).
  const result = [];
  const seenTitles = new Set();
  let lastEnd = -1;
  for (const f of found) {
    if (f.index < lastEnd) continue;
    if (seenTitles.has(f.title)) continue;
    result.push({ title: f.title, plain: f.plain, fixes: f.fixes });
    seenTitles.add(f.title);
    lastEnd = f.end;
  }
  return result;
}

export const SUPPORTED_LANGUAGES = Object.keys(PATTERNS);
