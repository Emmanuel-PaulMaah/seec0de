import { findTemplateMatch } from './codeGenerator';
import { getTemplateSummary } from './templateSummaries';

const PATTERNS = {
  comment: {
    python: /^\s*#(.*)$/,
    javascript: /^\s*\/\/(.*)$/,
    typescript: /^\s*\/\/(.*)$/,
    java: /^\s*\/\/(.*)$/,
    cpp: /^\s*\/\/(.*)$/,
    csharp: /^\s*\/\/(.*)$/,
    go: /^\s*\/\/(.*)$/,
    rust: /^\s*\/\/(.*)$/,
  },
  functionDef: {
    python: /^\s*def\s+(\w+)\s*\((.*?)\)/,
    javascript: /^\s*(async\s+)?function\s+(\w+)\s*\((.*?)\)/,
    typescript: /^\s*(async\s+)?function\s+(\w+)\s*\((.*?)\)/,
    java: /^\s*(public|private|protected|static|\s)*\s+\w+\s+(\w+)\s*\((.*?)\)/,
    cpp: /^\s*(\w+)\s+(\w+)\s*\((.*?)\)/,
    csharp: /^\s*(public|private|protected|static|\s)*\s+\w+\s+(\w+)\s*\((.*?)\)/,
    go: /^\s*func\s+(\w+)\s*\((.*?)\)/,
    rust: /^\s*(pub\s+)?fn\s+(\w+)\s*\((.*?)\)/,
  },
  classDef: {
    python: /^\s*class\s+(\w+)/,
    javascript: /^\s*class\s+(\w+)/,
    typescript: /^\s*class\s+(\w+)/,
    java: /^\s*(public\s+)?class\s+(\w+)/,
    cpp: /^\s*class\s+(\w+)/,
    csharp: /^\s*(public\s+)?class\s+(\w+)/,
    go: /^\s*type\s+(\w+)\s+struct/,
    rust: /^\s*(pub\s+)?struct\s+(\w+)/,
  },
  importStatement: {
    python: /^\s*(import|from)\s+/,
    javascript: /^\s*(import|require)\s*/,
    typescript: /^\s*(import|require)\s*/,
    java: /^\s*import\s+/,
    cpp: /^\s*#include\s*/,
    csharp: /^\s*using\s+/,
    go: /^\s*(import)\s*/,
    rust: /^\s*use\s+/,
  },
  variableAssign: {
    python: /^\s*(\w+)\s*=\s*(.+)/,
    javascript: /^\s*(const|let|var)\s+(\w+)\s*=\s*(.+)/,
    typescript: /^\s*(const|let|var)\s+(\w+)\s*[:\s]*.*=\s*(.+)/,
    java: /^\s*(\w+)\s+(\w+)\s*=\s*(.+)/,
    cpp: /^\s*(auto|int|string|double|float|bool|char|long|unsigned|vector|map|set)\s+(\w+)\s*=?\s*(.*)/,
    csharp: /^\s*(var|int|string|double|float|bool|char|long)\s+(\w+)\s*=\s*(.+)/,
    go: /^\s*(\w+)\s*:=\s*(.+)/,
    rust: /^\s*let\s+(mut\s+)?(\w+)\s*[:\s]*.*=\s*(.+)/,
  },
  returnStatement: /^\s*return\s+/,
  printStatement: {
    python: /^\s*print\s*\(/,
    javascript: /^\s*console\.(log|error|warn)\s*\(/,
    typescript: /^\s*console\.(log|error|warn)\s*\(/,
    java: /^\s*System\.out\.print(ln)?\s*\(/,
    cpp: /^\s*(cout|cerr)\s*<</,
    csharp: /^\s*Console\.Write(Line)?\s*\(/,
    go: /^\s*fmt\.(Print|Printf|Println)\s*\(/,
    rust: /^\s*(println!|print!|eprintln!)\s*\(/,
  },
  ifStatement: /^\s*(if|elif|else\s*if)\s*[\s(]/,
  elseStatement: /^\s*else\s*[{:]/,
  forLoop: /^\s*for\s+/,
  whileLoop: /^\s*while\s+/,
  closeBrace: /^\s*[}\]]\s*;?\s*$/,
  openBrace: /^\s*[{\[]\s*$/,
  emptyLine: /^\s*$/,
};

function detectOverallPattern(code, language) {
  const lines = code.split('\n');

  // CSS: describe the selectors and properties used
  if (language === 'css') {
    const hasMediaQuery = lines.some(l => /@media/.test(l));
    const hasVariables = lines.some(l => /--[\w-]+/.test(l));
    const hasFlexbox = lines.some(l => /display:\s*flex/.test(l));
    const hasGrid = lines.some(l => /display:\s*grid/.test(l));
    const hasTransitions = lines.some(l => /transition/.test(l));
    const selectors = lines.filter(l => l.trim().endsWith('{')).map(l => l.trim().replace(/\s*\{.*/, ''));
    const parts = [];
    if (selectors.length > 0) { const selDesc = selectors.length === 1 ? selectors[0] : selectors.length + ' selectors'; parts.push('targets ' + selDesc); }
    if (hasFlexbox) parts.push('uses flexbox layout');
    if (hasGrid) parts.push('uses CSS grid');
    if (hasMediaQuery) parts.push('includes responsive media queries');
    if (hasVariables) parts.push('defines CSS variables');
    if (hasTransitions) parts.push('uses transitions for animation');
    return parts.length > 0 ? `This CSS ${parts.join(', ')}.` : 'This CSS defines styles for HTML elements.';
  }

  // HTML: describe the structure
  if (language === 'html') {
    const tagNames = [...new Set(lines.map(l => { const m = l.match(/<([a-zA-Z][a-zA-Z0-9]*)/); return m ? m[1] : null; }).filter(Boolean))];
    const hasForms = tagNames.some(t => ['form', 'input', 'select', 'textarea', 'button'].includes(t));
    const hasSemantic = tagNames.some(t => ['header', 'nav', 'main', 'article', 'section', 'aside', 'footer'].includes(t));
    const hasTable = tagNames.includes('table');
    const hasMedia = tagNames.some(t => ['img', 'video', 'audio', 'iframe'].includes(t));
    const hasLists = tagNames.some(t => ['ul', 'ol', 'li'].includes(t));
    const parts = [];
    if (hasSemantic) parts.push('uses semantic HTML elements for structure');
    if (hasForms) parts.push('includes form elements for user input');
    if (hasTable) parts.push('contains a data table');
    if (hasMedia) parts.push('embeds media content');
    if (hasLists) parts.push('uses lists to organize content');
    if (parts.length === 0 && tagNames.length > 0) parts.push(`uses ${tagNames.length} different HTML elements`);
    return parts.length > 0 ? `This HTML ${parts.join(', ')}.` : 'This HTML defines the structure of a web page.';
  }

  // Git: describe the workflow
  if (language === 'git') {
    const commands = lines.map(l => l.replace(/#.*$/, '').trim()).filter(Boolean).map(l => l.split(/\s+/).slice(0, 2).join(' '));
    const hasInit = commands.some(c => c === 'git init');
    const hasCommit = commands.some(c => c === 'git commit');
    const hasBranch = commands.some(c => c === 'git branch');
    const hasMerge = commands.some(c => c === 'git merge');
    const hasPush = commands.some(c => c === 'git push');
    const hasClone = commands.some(c => c === 'git clone');
    const parts = [];
    if (hasInit) parts.push('initializes a repository');
    if (hasCommit) parts.push('commits changes');
    if (hasBranch) parts.push('creates or lists branches');
    if (hasMerge) parts.push('merges branches');
    if (hasPush) parts.push('pushes to a remote');
    if (hasClone) parts.push('clones a remote repository');
    return parts.length > 0 ? `This Git workflow ${parts.join(', ')}.` : 'This shows Git commands for version control.';
  }

  const hasClass = lines.some(l => PATTERNS.classDef[language]?.test(l));
  const hasFunctions = lines.some(l => PATTERNS.functionDef[language]?.test(l));
  const hasLoops = lines.some(l => PATTERNS.forLoop.test(l) || PATTERNS.whileLoop.test(l));
  const hasImports = lines.some(l => PATTERNS.importStatement[language]?.test(l));
  const hasConditionals = lines.some(l => PATTERNS.ifStatement.test(l));

  // New detections
  const hasErrorHandling = lines.some(l => /^\s*(try|except|catch|finally)\s*[:{]/.test(l));
  const hasArrays = lines.some(l => /\[.*\]/.test(l) && !/^\s*\/\//.test(l));
  const hasDictOrObject = lines.some(l => /\{.*:.*\}/.test(l) || /^\s*\w+\s*:\s*\w+/.test(l));
  const hasComprehension = language === 'python' && lines.some(l => /\[.+\s+for\s+.+\s+in\s+/.test(l));
  const hasArrowFunctions = lines.some(l => /=>\s*[{(]?/.test(l) || /^\s*\w+\s*=>\s*/.test(l));
  const hasStringOps = lines.some(l => /['"`].*['"`]\s*[+.]|\.split\(|\.join\(|\.replace\(|\.includes\(/.test(l));
  const hasMethodCalls = lines.some(l => /^\s*\w+\.\w+\s*\(/.test(l));
  const hasReturn = lines.some(l => PATTERNS.returnStatement.test(l));

  const parts = [];
  if (hasClass) parts.push('defines a class');
  if (hasFunctions || hasArrowFunctions) parts.push('contains function definitions');
  if (hasLoops) parts.push('uses loops');
  if (hasConditionals) parts.push('includes conditional logic');
  if (hasImports) parts.push('imports external modules');
  if (hasErrorHandling) parts.push('handles errors');
  if (hasArrays) parts.push('works with arrays/lists');
  if (hasDictOrObject) parts.push('uses objects/dictionaries');
  if (hasComprehension) parts.push('uses list comprehensions');
  if (hasStringOps) parts.push('manipulates strings');
  if (hasMethodCalls) parts.push('calls methods on objects');
  if (hasReturn) parts.push('returns values from functions');

  if (parts.length === 0) return 'This code contains basic statements and expressions.';
  return `This code ${parts.join(', ')}.`;
}

// Render a short literal value for inclusion in a sentence. Long expressions
// collapse to "a value" so we don't dump a 200-character ternary into prose.
function shortLiteral(rhs) {
  if (!rhs) return null;
  const cleaned = rhs.replace(/;+\s*$/, '').trim();
  if (!cleaned) return null;
  if (cleaned.length > 60) return null;
  return cleaned;
}

// Pull the parameter list out of "fn name(a, b, c)" / "def name(a, b)" etc.
// Returns "" when nothing was captured. Used so the function-def explanation
// can mention the actual parameters instead of just "a function".
function extractParamList(line) {
  const m = line.match(/\(([^)]*)\)/);
  if (!m) return '';
  return m[1].trim();
}

function describeParams(params) {
  if (!params) return ' that takes no parameters';
  const list = params
    .split(',')
    .map((p) => p.trim().replace(/[:=].*$/, '').replace(/^\.\\.\\./, '').trim())
    .filter(Boolean);
  if (list.length === 0) return ' that takes no parameters';
  if (list.length === 1) return ` that takes one parameter (\`${list[0]}\`)`;
  if (list.length <= 4) return ` that takes ${list.length} parameters (\`${list.join('`, `')}\`)`;
  return ` that takes ${list.length} parameters`;
}

// Describe what a function does based on its body (for inline lambdas / arrow functions).
function describeExpressionBody(expr) {
  if (!expr) return '';
  const trimmed = expr.trim();
  if (/^(true|false|null|undefined|\d+|['"`])/.test(trimmed)) return ` returns the value \`${shortLiteral(trimmed) || trimmed}\``;
  if (/^\w+\s*\(/.test(trimmed)) return ` calls \`${trimmed.match(/^(\w+)/)[1]}\``;
  if (/^\w+\s*[+\-*/]/.test(trimmed)) return ` performs arithmetic`;
  if (/^\w+\s*===?\s*/.test(trimmed)) return ` compares values`;
  return '';
}

function explainLine(line, language) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Comments
  const commentPattern = PATTERNS.comment[language];
  if (commentPattern && commentPattern.test(line)) {
    const match = line.match(commentPattern);
    return `Comment: ${match[1].trim()}`;
  }

  // ---- CSS explanation ----
  if (language === 'css') {
    const cssResult = explainCssLine(trimmed, line);
    if (cssResult) return cssResult;
  }

  // ---- HTML explanation ----
  if (language === 'html') {
    const htmlResult = explainHtmlLine(trimmed);
    if (htmlResult) return htmlResult;
  }

  // ---- Git command explanation ----
  if (language === 'git') {
    const gitResult = explainGitLine(trimmed);
    if (gitResult) return gitResult;
  }

  // Import
  const importPattern = PATTERNS.importStatement[language];
  if (importPattern && importPattern.test(line)) {
    const target = trimmed
      .replace(/^[#]?\s*(import|from|require|using|use|include)\s*/i, '')
      .replace(/[;{}<>"']/g, '')
      .trim();
    if (target) return `Imports \`${target}\` so its functions/types are available below.`;
    return `Imports a module or library for use in this program.`;
  }

  // Class definition
  const classPattern = PATTERNS.classDef[language];
  if (classPattern && classPattern.test(line)) {
    const match = line.match(classPattern);
    const name = match[match.length - 1] || match[1];
    const extendsMatch = line.match(/\b(extends|:\s*public)\s+(\w+)/);
    const parent = extendsMatch ? extendsMatch[2] : null;
    if (parent) return `Defines class \`${name}\` that inherits from \`${parent}\` (it gets \`${parent}\`'s fields/methods and can override them).`;
    return `Defines class \`${name}\` — a blueprint for objects that share these properties and methods.`;
  }

  // Function definition
  const funcPattern = PATTERNS.functionDef[language];
  if (funcPattern && funcPattern.test(line)) {
    const match = line.match(funcPattern);
    const parts = match.filter(Boolean);
    const isAsync = /async/.test(line);
    const name = parts.length > 1 ? parts[parts.length - 2] : null;
    const params = extractParamList(line);
    const paramPhrase = describeParams(params);
    if (name) {
      return `Defines ${isAsync ? 'async ' : ''}function \`${name}\`${paramPhrase}.`;
    }
    return `Defines ${isAsync ? 'an asynchronous ' : 'a '}function${paramPhrase}.`;
  }

  // Arrow function (JS/TS)
  if (language === 'javascript' || language === 'typescript') {
    // const fn = (a, b) => a + b
    const arrowMatch = trimmed.match(/^(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*(.+)/);
    if (arrowMatch) {
      const [, name, params, body] = arrowMatch;
      const paramList = params.split(',').map(p => p.trim()).filter(Boolean);
      const paramDesc = paramList.length === 0 ? '' : ` taking \`${paramList.join('`, `')}\``;
      const bodyDesc = describeExpressionBody(body);
      return `Defines arrow function \`${name}\`${paramDesc}${bodyDesc ? ',' + bodyDesc : '.'}`;
    }
    // const fn = x => x * 2
    const singleArrowMatch = trimmed.match(/^(?:const|let|var)\s+(\w+)\s*=\s*(\w+)\s*=>\s*(.+)/);
    if (singleArrowMatch) {
      const [, name, param, body] = singleArrowMatch;
      const bodyDesc = describeExpressionBody(body);
      return `Defines arrow function \`${name}\` taking \`${param}\`${bodyDesc ? ',' + bodyDesc : '.'}`;
    }
    // (a, b) => { ... }  (anonymous)
    const anonArrowMatch = trimmed.match(/^\(([^)]*)\)\s*=>\s*\{/);
    if (anonArrowMatch) {
      const paramList = anonArrowMatch[1].split(',').map(p => p.trim()).filter(Boolean);
      return `Defines an anonymous arrow function${paramList.length > 0 ? ` taking \`${paramList.join('`, `')}\`` : ''}.`;
    }
  }

  // Lambda (Python)
  if (language === 'python') {
    const lambdaMatch = trimmed.match(/^(\w+)\s*=\s*lambda\s+(.+?):\s*(.+)/);
    if (lambdaMatch) {
      const [, name, params, body] = lambdaMatch;
      const paramList = params.split(',').map(p => p.trim()).filter(Boolean);
      return `Defines lambda function \`${name}\`${paramList.length > 0 ? ` taking \`${paramList.join('`, `')}\`` : ''}, returning \`${body.trim()}\`.`;
    }
  }

  // Variable assignment — pull out the literal value where possible so the
  // explanation reads "Stores [5, 3, 8] in `numbers`." instead of
  // "Declares and assigns a variable."
  const varPattern = PATTERNS.variableAssign[language];
  if (varPattern && varPattern.test(line)) {
    const match = line.match(varPattern);
    let name, rhs;
    if (language === 'python') {
      name = match[1];
      rhs = match[2];
    } else if (language === 'go') {
      name = match[1];
      rhs = match[2];
    } else if (language === 'rust') {
      name = match[2];
      rhs = match[3];
    } else {
      // js/ts/java/cpp/csharp all have: keyword/type, name, rhs
      name = match[2];
      rhs = match[3];
    }
    const lit = shortLiteral(rhs);
    const mutNote = language === 'rust' && /let\s+mut/.test(line) ? ' (mutable)' : '';
    if (name && lit) return `Stores \`${lit}\` in \`${name}\`${mutNote}.`;
    if (name) return `Computes a value and stores it in \`${name}\`${mutNote}.`;
    return `Declares and assigns a variable.`;
  }

  // Print/output — try to surface the actual argument so the line reads
  // "Prints \"Hello, World!\" to the console." instead of "Outputs a value."
  const printPattern = PATTERNS.printStatement[language];
  if (printPattern && printPattern.test(line)) {
    let arg = '';
    const parenMatch = line.match(/\(([\s\S]+)\)\s*;?\s*$/);
    const shiftMatch = line.match(/<<\s*[^<;]+/);
    if (parenMatch) arg = parenMatch[1].trim();
    else if (shiftMatch) arg = shiftMatch[1].trim();
    const lit = shortLiteral(arg);
    if (lit) return `Prints ${lit} to the console.`;
    return `Outputs/prints a value to the console.`;
  }

  // Return statement
  if (PATTERNS.returnStatement.test(line)) {
    const retVal = trimmed.replace(/^return\s+/, '').replace(/;+\s*$/, '').trim();
    const lit = shortLiteral(retVal);
    if (lit) return `Returns \`${lit}\` from the current function.`;
    return `Returns a value from the current function back to wherever it was called.`;
  }

  // If statement
  if (PATTERNS.ifStatement.test(line)) {
    if (/elif|else\s*if/.test(trimmed)) {
      return `Checks an additional condition if the previous condition(s) were false.`;
    }
    return `Conditional check — the following code only runs if this condition is true.`;
  }

  // Else
  if (PATTERNS.elseStatement.test(line) || trimmed === 'else:' || trimmed === 'else {' || trimmed === '} else {') {
    return `Fallback block — runs if none of the above conditions were true.`;
  }

  // For loop
  if (PATTERNS.forLoop.test(line)) {
    if (/for.*in\s+range/.test(line)) return `Count-based loop — repeats code for a sequence of numbers.`;
    if (/for.*of\s+/.test(line)) return `Iterates over each value in a collection.`;
    if (/for.*in\s+/.test(line)) return `Iterates over each item in a collection.`;
    if (/for.*:.*range/.test(line)) return `Range-based loop — iterates over elements with index.`;
    if (/for\s*\(/.test(line)) return `Loop with a counter — repeats code a specific number of times.`;
    if (/for\s+\w+\s+in\s+/.test(line)) return `Iterator loop — processes each item in a sequence.`;
    return `Loop — repeats the following block of code multiple times.`;
  }

  // While loop
  if (PATTERNS.whileLoop.test(line)) {
    return `While loop — keeps repeating the following code as long as the condition remains true.`;
  }

  // Break / continue
  if (/^\s*break\s*;?\s*$/.test(trimmed)) {
    return `Exits the loop immediately — skips any remaining iterations.`;
  }
  if (/^\s*continue\s*;?\s*$/.test(trimmed)) {
    return `Skips to the next iteration of the loop — skips the rest of this pass.`;
  }

  // Try/catch
  if (/^\s*try\s*[:{]/.test(line)) {
    return `Begins an error-handling block — if code inside fails, the error is caught instead of crashing.`;
  }
  if (/^\s*(except|catch)\s*/.test(line)) {
    return `Catches an error/exception — handles the failure gracefully.`;
  }
  if (/^\s*finally\s*[:{]/.test(line)) {
    return `Finally block — this code always runs, whether an error occurred or not.`;
  }

  // Switch / match
  if (/^\s*switch\s*\(/.test(trimmed) || /^\s*match\s+/.test(trimmed)) {
    const value = trimmed.match(/(?:switch\s*\(|match\s+)(\w+)/);
    if (value) return `Evaluates \`${value[1]}\` and runs the matching case block.`;
    return `Evaluates an expression and runs the code block that matches.`;
  }
  if (/^\s*case\s+/.test(trimmed)) {
    const caseVal = trimmed.match(/case\s+(.+?):/);
    if (caseVal) return `Handles the case where the value equals \`${caseVal[1].trim()}\`.`;
    return `Handles a specific matching case.`;
  }
  if (/^\s*default\s*[:{]/.test(trimmed) || /^\s*_\s*=>/.test(trimmed)) {
    return `Default/fallback case — runs when no other case matches.`;
  }

  // Ternary / conditional expression
  // JS/TS: condition ? a : b
  if (/\?\s*.+\s*:/.test(trimmed) && !/^\s*\/\//.test(trimmed)) {
    const ternaryMatch = trimmed.match(/(.+?)\?\s*(.+?)\s*:\s*(.+)/);
    if (ternaryMatch) {
      const [, cond, ifTrue, ifFalse] = ternaryMatch;
      const condShort = shortLiteral(cond);
      if (condShort) return `If \`${condShort}\` is true, uses \`${ifTrue.trim()}\`; otherwise uses \`${ifFalse.trim()}\`.`;
      return `Inline conditional — returns one value if true, another if false.`;
    }
    return `Inline conditional expression — picks between two values based on a condition.`;
  }
  // Python: a if condition else b
  if (/\s+if\s+.+\s+else\s+/.test(trimmed) && language === 'python') {
    const pyTernary = trimmed.match(/(.+?)\s+if\s+(.+?)\s+else\s+(.+)/);
    if (pyTernary) {
      const [, ifTrue, cond, ifFalse] = pyTernary;
      return `If \`${cond.trim()}\` is true, uses \`${ifTrue.trim()}\`; otherwise uses \`${ifFalse.trim()}\`.`;
    }
    return `Inline conditional expression — picks between two values based on a condition.`;
  }

  // String concatenation with +
  if (/['"`].*['"`]\s*\+|\+\s*['"`]/.test(trimmed) && !/^\s*\/\//.test(trimmed)) {
    return `Joins strings together using concatenation.`;
  }

  // Template literal (JS/TS)
  if (/`[^`]*\$\{/.test(trimmed)) {
    return `Creates a string with embedded expressions using a template literal.`;
  }

  // Array/list methods (JS/TS)
  if (/\.\s*(map|filter|reduce|forEach|find|some|every)\s*\(/.test(trimmed)) {
    const methodMatch = trimmed.match(/\.(\w+)\s*\(/);
    if (methodMatch) {
      const method = methodMatch[1];
      const descriptions = {
        map: 'creates a new array by transforming each element',
        filter: 'creates a new array with elements that pass a test',
        reduce: 'combines all elements into a single value',
        forEach: 'runs a function on each element',
        find: 'finds the first element that passes a test',
        some: 'checks if at least one element passes a test',
        every: 'checks if all elements pass a test',
      };
      return `Array method: ${descriptions[method] || `calls \`${method}\` on the array`} — ${method === 'map' || method === 'filter' ? 'does not modify the original array' : 'processes each element'}.`;
    }
  }

  // Array push/pop/shift/unshift (JS/TS)
  if (/\.\s*(push|pop|shift|unshift|splice)\s*\(/.test(trimmed)) {
    const methodMatch = trimmed.match(/\.(\w+)\s*\(/);
    if (methodMatch) {
      const method = methodMatch[1];
      const descriptions = {
        push: 'adds an element to the end of the array',
        pop: 'removes and returns the last element from the array',
        shift: 'removes and returns the first element from the array',
        unshift: 'adds an element to the beginning of the array',
        splice: 'adds or removes elements at a specific position',
      };
      return `Array method: ${descriptions[method]}.`;
    }
  }

  // Python list/dict methods
  if (language === 'python') {
    if (/\.\s*(append|extend|insert|pop|remove|sort|reverse)\s*\(/.test(trimmed)) {
      const methodMatch = trimmed.match(/\.(\w+)\s*\(/);
      if (methodMatch) {
        const method = methodMatch[1];
        const descriptions = {
          append: 'adds an element to the end of the list',
          extend: 'adds all elements from another list to the end',
          insert: 'adds an element at a specific position',
          pop: 'removes and returns an element (last by default)',
          remove: 'removes the first occurrence of a value',
          sort: 'sorts the list in place',
          reverse: 'reverses the order of elements in place',
        };
        return `List method: ${descriptions[method]}.`;
      }
    }
    if (/\.\s*(keys|values|items|get|update|pop)\s*\(/.test(trimmed)) {
      const methodMatch = trimmed.match(/\.(\w+)\s*\(/);
      if (methodMatch) {
        const method = methodMatch[1];
        const descriptions = {
          keys: 'returns all keys in the dictionary',
          values: 'returns all values in the dictionary',
          items: 'returns all key-value pairs',
          get: 'retrieves a value by key (with optional default)',
          update: 'merges another dictionary into this one',
          pop: 'removes and returns a value by key',
        };
        return `Dictionary method: ${descriptions[method]}.`;
      }
    }
  }

  // Python list comprehension
  if (language === 'python' && /\[.+\s+for\s+.+\s+in\s+/.test(trimmed)) {
    const compMatch = trimmed.match(/\[(.+?)\s+for\s+(\w+)\s+in\s+(.+?)\]/);
    if (compMatch) {
      const [, expr, varName, iterable] = compMatch;
      const filterMatch = expr.match(/(.+?)\s+if\s+(.+)/);
      if (filterMatch) {
        return `List comprehension: creates a new list by taking \`${filterMatch[1].trim()}\` from each \`${varName}\` in \`${iterable.trim()}\` where \`${filterMatch[2].trim()}\` is true.`;
      }
      return `List comprehension: creates a new list by applying \`${expr.trim()}\` to each \`${varName}\` in \`${iterable.trim()}\`.`;
    }
    return `List comprehension — builds a new list by transforming or filtering elements from an existing one.`;
  }

  // Python dict comprehension
  if (language === 'python' && /\{.+\s+for\s+.+\s+in\s+/.test(trimmed)) {
    return `Dictionary comprehension — builds a new dictionary by transforming keys and values from an existing iterable.`;
  }

  // String methods (JS/TS/Python)
  if (/\.\s*(split|join|replace|includes|startsWith|endsWith|trim|slice|substring|indexOf|toLowerCase|toUpperCase|match|search)\s*\(/.test(trimmed)) {
    const methodMatch = trimmed.match(/\.(\w+)\s*\(/);
    if (methodMatch) {
      const method = methodMatch[1];
      const descriptions = {
        split: 'splits a string into an array of parts',
        join: 'joins array elements into a single string',
        replace: 'replaces part of the string with new text',
        includes: 'checks if the string contains a substring',
        startsWith: 'checks if the string starts with a substring',
        endsWith: 'checks if the string ends with a substring',
        trim: 'removes whitespace from both ends',
        slice: 'extracts a portion of the string',
        substring: 'extracts a portion of the string',
        indexOf: 'finds the position of a substring',
        toLowerCase: 'converts the string to lowercase',
        toUpperCase: 'converts the string to uppercase',
        match: 'checks the string against a pattern',
        search: 'finds the position matching a pattern',
      };
      return `String method: ${descriptions[method]}.`;
    }
  }

  // Constructor / super
  if (/^\s*super\s*\(/.test(line) || /^\s*super\(\)/.test(line)) {
    return `Calls the parent class constructor — initializes inherited properties.`;
  }
  if (/^\s*(self|this)\.\w+\s*=/.test(line)) {
    return `Sets an instance property on the current object.`;
  }
  // Python __init__
  if (/^\s*def\s+__init__\s*\(/.test(trimmed)) {
    const paramList = extractParamList(trimmed);
    const paramNames = paramList.split(',').map(p => p.trim().replace(/^self,?\s*/, '')).filter(Boolean);
    return `Defines the constructor (\`__init__\`) — runs when a new object is created${paramNames.length > 0 ? `, taking \`${paramNames.join('`, `')}\` as arguments` : ''}.`;
  }
  // JS/TS constructor
  if (/^\s*constructor\s*\(/.test(trimmed)) {
    const paramList = extractParamList(trimmed);
    const paramNames = paramList.split(',').map(p => p.trim()).filter(Boolean);
    return `Defines the constructor — runs when a new object is created${paramNames.length > 0 ? `, taking \`${paramNames.join('`, `')}\` as arguments` : ''}.`;
  }

  // Namespace/package
  if (/^\s*namespace\s+/.test(line) || /^\s*package\s+/.test(line)) {
    return `Declares the namespace/package this code belongs to.`;
  }

  // Using/with
  if (/^\s*with\s+/.test(line)) {
    return `Context manager — ensures proper setup and cleanup (e.g., closing files automatically).`;
  }
  if (/^\s*using\s+namespace/.test(line)) {
    return `Brings all names from a namespace into scope for convenience.`;
  }

  // Decorator
  if (/^\s*@\w+/.test(line)) {
    return `Decorator — modifies or extends the behavior of the following function or class.`;
  }

  // Throw/raise
  if (/^\s*(throw|raise)\s+/.test(line)) {
    return `Throws/raises an error — signals that something went wrong.`;
  }

  // Type annotations (TS/Python)
  if (language === 'typescript' && /:\s*(string|number|boolean|any|unknown|void|null|undefined)\b/.test(trimmed)) {
    const typeMatch = trimmed.match(/:\s*(string|number|boolean|any|unknown|void|null|undefined)\b/);
    if (typeMatch) return `Type annotation — restricts this to \`${typeMatch[1]}\` values.`;
  }
  if (language === 'python' && /:\s*(str|int|float|bool|list|dict|tuple|set|None)\b/.test(trimmed)) {
    const typeMatch = trimmed.match(/:\s*(str|int|float|bool|list|dict|tuple|set|None)\b/);
    if (typeMatch) return `Type hint — suggests this should be a \`${typeMatch[1]}\` value.`;
  }

  // Destructuring (JS/TS)
  if (language === 'javascript' || language === 'typescript') {
    if (/^\s*(const|let|var)\s+\{/.test(trimmed)) {
      const destructureMatch = trimmed.match(/\{([^}]+)\}/);
      if (destructureMatch) {
        const keys = destructureMatch[1].split(',').map(k => k.trim().split(':')[0].trim()).filter(Boolean);
        return `Destructures object properties into individual variables: \`${keys.join('`, `')}\`.`;
      }
      return `Destructures an object — extracts properties into separate variables.`;
    }
    if (/^\s*(const|let|var)\s+\[/.test(trimmed)) {
      const destructureMatch = trimmed.match(/\[([^\]]+)\]/);
      if (destructureMatch) {
        const vars = destructureMatch[1].split(',').map(v => v.trim()).filter(Boolean);
        return `Destructures array elements into variables: \`${vars.join('`, `')}\`.`;
      }
      return `Destructures an array — extracts elements into separate variables.`;
    }
  }

  // Increment/decrement
  if (/^\s*\w+\s*(\+\+|--)\s*;?\s*$/.test(trimmed)) {
    const opMatch = trimmed.match(/(\+\+|--)/);
    return opMatch[1] === '++'
      ? `Increments the variable by 1.`
      : `Decrements the variable by 1.`;
  }
  if (/^\s*(\+\+|--)\s*\w+\s*;?\s*$/.test(trimmed)) {
    const opMatch = trimmed.match(/(\+\+|--)/);
    return opMatch[1] === '++'
      ? `Increments the variable by 1 (before use).`
      : `Decrements the variable by 1 (before use).`;
  }

  // Logical operators (when used as expressions)
  if (/\&\&|\|\||\!\s*\w/.test(trimmed) && !/^\s*\/\//.test(trimmed)) {
    // Only explain if it's a standalone expression, not part of an if/while
    if (!/^\s*(if|while|elif|else\s*if)\s/.test(trimmed)) {
      return `Combines boolean conditions using logical operators.`;
    }
  }

  // Method call
  if (/^\s*\w+\.\w+\s*\(/.test(line)) {
    return `Calls a method on an object — performs an action or retrieves data.`;
  }

  // Generic assignment or expression
  if (/=/.test(line) && !/==/.test(line)) {
    return `Assigns a value — stores data for use later in the program.`;
  }

  return `Executes a statement in the program.`;
}

// ---------------------------------------------------------------------------
// CSS explanation
// ---------------------------------------------------------------------------
const CSS_PROPERTY_EXPLANATIONS = {
  display: {
    flex: 'Makes this element a flex container — its children lay out in a row by default.',
    'flex-direction': 'Sets the main axis direction for flex children (row or column).',
    grid: 'Makes this element a grid container — children are placed in a two-dimensional grid.',
    block: 'Makes the element a block — it takes full width and starts on a new line.',
    inline: 'Makes the element inline — it flows within surrounding text.',
    'inline-block': 'Combines inline flow with block-level sizing and padding.',
    none: 'Hides the element completely — it takes no space in the layout.',
  },
  'justify-content': {
    center: 'Centers flex items along the main axis.',
    'space-between': 'Distributes items with equal space between them (none at edges).',
    'space-around': 'Distributes items with equal space around each one.',
    'flex-start': 'Aligns items to the start of the main axis.',
    'flex-end': 'Aligns items to the end of the main axis.',
  },
  'align-items': {
    center: 'Centers flex items along the cross axis (vertically in a row).',
    stretch: 'Stretches items to fill the container\'s cross-axis height.',
    'flex-start': 'Aligns items to the top of the cross axis.',
    'flex-end': 'Aligns items to the bottom of the cross axis.',
  },
  position: {
    relative: 'Offsets the element from its normal position without removing it from flow.',
    absolute: 'Removes the element from flow and positions it relative to the nearest positioned ancestor.',
    fixed: 'Removes the element from flow and positions it relative to the viewport.',
    sticky: 'Toggles between relative and fixed depending on scroll position.',
  },
  'box-sizing': {
    'border-box': 'Includes padding and border in the element\'s total width/height — simpler layout math.',
    'content-box': 'The default: width/height only applies to the content area, padding and border are added on top.',
  },
};

function explainCssLine(trimmed, rawLine) {
  if (!trimmed || trimmed.startsWith('/*') || trimmed.startsWith('*')) return null;

  // CSS comment
  if (trimmed.startsWith('/*') && trimmed.endsWith('*/')) {
    return `Comment: ${trimmed.slice(2, -2).trim()}`;
  }

  // @media query
  if (trimmed.startsWith('@media')) {
    const query = trimmed.match(/@media\s*\((.+)\)/);
    if (query) return `Media query — applies the following styles only when ${query[1]} is true.`;
    return `Media query — applies styles conditionally based on device or viewport conditions.`;
  }

  // @keyframes
  if (trimmed.startsWith('@keyframes')) {
    const name = trimmed.match(/@keyframes\s+(\w+)/);
    return name ? `Defines animation keyframes named \`${name[1]}\` — sets style changes at specific points.` : 'Defines animation keyframes — specifies style changes at percentage points.';
  }

  // :root or pseudo-class selectors
  if (trimmed.startsWith(':root') || trimmed.startsWith('.') || trimmed.startsWith('#') || /^[a-z]/.test(trimmed)) {
    // Selector with opening brace
    if (trimmed.endsWith('{')) {
      const selector = trimmed.replace(/\s*\{.*/, '').trim();
      if (selector === ':root') return 'Defines CSS custom properties (variables) available to the entire document.';
      if (selector.startsWith('.')) return `Targets all elements with class \`${selector.slice(1)}\` — applies the following styles.`;
      if (selector.startsWith('#')) return `Targets the element with id \`${selector.slice(1)}\` — applies the following styles.`;
      if (selector.includes(':hover')) return `Applies styles when the user hovers over \`${selector.replace(':hover', '')}\` elements.`;
      if (selector.includes(':')) return `Applies styles to \`${selector}\` in the specified state.`;
      return `Targets \`${selector}\` elements — applies the following styles.`;
    }
  }

  // Property: value;
  const propMatch = trimmed.match(/^([\w-]+)\s*:\s*(.+);\s*$/);
  if (propMatch) {
    const [, property, value] = propMatch;
    const valueClean = value.replace(/\/\*.*?\*\//g, '').trim();

    // Check known property explanations
    if (CSS_PROPERTY_EXPLANATIONS[property]) {
      const explanation = CSS_PROPERTY_EXPLANATIONS[property][valueClean];
      if (explanation) return explanation;
    }

    // Common property families
    if (property === 'color' || property === 'background-color' || property === 'background') {
      return `Sets the ${property === 'color' ? 'text' : 'background'} color to \`${valueClean}\`.`;
    }
    if (property === 'margin' || property === 'padding') {
      return `Sets ${property} (outer spacing) to \`${valueClean}\` — controls the space around/between elements.`;
    }
    if (property === 'border') return `Sets the border to \`${valueClean}\` — draws an edge around the element.`;
    if (property === 'border-radius') return `Rounds the corners of the element by \`${valueClean}\`.`;
    if (property === 'width' || property === 'height') return `Sets the ${property} to \`${valueClean}\`.`;
    if (property === 'font-size') return `Sets the text size to \`${valueClean}\`.`;
    if (property === 'font-family') return `Sets the typeface to \`${valueClean}\`.`;
    if (property === 'font-weight') return `Sets the boldness of text to \`${valueClean}\`.`;
    if (property === 'line-height') return `Sets the spacing between lines of text to \`${valueClean}\`.`;
    if (property === 'text-align') return `Aligns text ${valueClean} within its container.`;
    if (property === 'gap') return `Sets the spacing between grid/flex items to \`${valueClean}\`.`;
    if (property === 'grid-template-columns') return `Defines the column layout of the grid: \`${valueClean}\`.`;
    if (property === 'grid-template-rows') return `Defines the row layout of the grid: \`${valueClean}\`.`;
    if (property === 'flex-direction') return `Sets the main axis direction to \`${valueClean}\` — items flow ${valueClean === 'column' ? 'top to bottom' : 'left to right'}.`;
    if (property === 'transition') return `Animates style changes over \`${valueClean}\` — makes property changes smooth instead of instant.`;
    if (property === 'opacity') return `Sets transparency to \`${valueClean}\` — 0 is fully invisible, 1 is fully opaque.`;
    if (property === 'z-index') return `Sets the stacking order to \`${valueClean}\` — higher values appear in front.`;
    if (property === 'overflow') return `Controls what happens when content is larger than the element: \`${valueClean}\`.`;
    if (property === 'cursor') return `Sets the mouse cursor to \`${valueClean}\` when hovering over this element.`;
    if (property === 'transform') return `Applies a geometric transformation: \`${valueClean}\`.`;
    if (property === 'box-shadow') return `Adds a shadow effect: \`${valueClean}\`.`;
    if (property.startsWith('--')) return `Defines a custom property (CSS variable) named \`${property}\` with value \`${valueClean}\`.`;
    return `Sets \`${property}\` to \`${valueClean}\`.`;
  }

  // Shorthand properties without semicolons (in teaching blocks)
  if (/^(margin|padding):/.test(trimmed)) {
    return `Sets ${trimmed.split(':')[0]} (spacing) — controls the space around the element.`;
  }
  if (/^(display|position|flex|grid|font|color|background|border|width|height|overflow|cursor|opacity|z-index|gap):/.test(trimmed)) {
    const prop = trimmed.split(':')[0];
    return `Sets the \`${prop}\` property.`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// HTML explanation
// ---------------------------------------------------------------------------
const HTML_TAG_EXPLANATIONS = {
  '<!DOCTYPE html>': 'Declares this document as HTML5 — tells the browser which version of HTML to use.',
  '<html>': 'The root element — wraps all content on the page.',
  '<head>': 'Contains metadata about the page (title, links to stylesheets, character set) — not visible on screen.',
  '<body>': 'Contains all the visible content of the page.',
  '<title>': 'Sets the text shown in the browser tab or window title bar.',
  '<h1>': 'The most important heading — use one per page for the main title.',
  '<h2>': 'A section heading — used for major sections within the page.',
  '<h3>': 'A subsection heading — used for topics within an <h2> section.',
  '<h4>': 'A sub-subsection heading — used for details within an <h3>.',
  '<h5>': 'A minor heading — used sparingly for deeply nested sections.',
  '<h6>': 'The least important heading — used for the lowest level of section hierarchy.',
  '<p>': 'A paragraph of text — browsers add spacing before and after.',
  '<strong>': 'Strong importance — browsers render this as bold, and screen readers emphasize it.',
  '<em>': 'Emphasis — browsers render this as italic, and screen readers stress it.',
  '<a>': 'A hyperlink — clicking it navigates to the URL specified in the href attribute.',
  '<img>': 'An image — the src attribute specifies the image file, alt provides a text description.',
  '<ul>': 'An unordered (bulleted) list — each item is wrapped in <li>.',
  '<ol>': 'An ordered (numbered) list — each item is wrapped in <li>.',
  '<li>': 'A list item — must be inside a <ul> or <ol>.',
  '<table>': 'A table for tabular data — use <tr> for rows, <th> for headers, <td> for data cells.',
  '<tr>': 'A table row — contains <th> or <td> cells.',
  '<th>': 'A table header cell — typically bold and centered.',
  '<td>': 'A table data cell — contains the actual data.',
  '<form>': 'A form for user input — the action attribute specifies where to send the data.',
  '<input>': 'An input field — the type attribute controls what kind of input (text, password, email, etc.).',
  '<button>': 'A clickable button — can trigger actions when pressed.',
  '<select>': 'A dropdown menu — each option is wrapped in <option>.',
  '<option>': 'An option inside a <select> dropdown — the value attribute is what gets submitted.',
  '<textarea>': 'A multi-line text input area — users can type longer text.',
  '<label>': 'A label for a form input — the for attribute links it to the input\'s id.',
  '<header>': 'Introductory content or navigation — typically contains the site logo and nav.',
  '<nav>': 'Navigation links — a section with links to other pages or sections.',
  '<main>': 'The main content of the page — there should be only one per page.',
  '<article>': 'Self-contained content that could be independently distributed (blog post, news story).',
  '<section>': 'A thematic grouping of content — usually with a heading.',
  '<aside>': 'Tangentially related content — often used for sidebars.',
  '<footer>': 'Footer content — typically copyright info, links, and contact details.',
  '<div>': 'A generic container — used for grouping and styling when no semantic element fits.',
  '<span>': 'An inline generic container — used for styling a portion of text within a block.',
  '<br>': 'A line break — forces the following content onto a new line.',
  '<hr>': 'A thematic break — typically rendered as a horizontal line to separate sections.',
  '<meta>': 'Metadata about the page — not visible, used by browsers and search engines.',
  '<link>': 'Links an external resource (stylesheet, favicon) to the page.',
  '<style>': 'Contains CSS rules that style the page — placed in the <head>.',
  '<script>': 'Contains or links to JavaScript code that adds interactivity.',
  '<video>': 'Embeds a video player — the src attribute specifies the video file.',
  '<audio>': 'Embeds an audio player — the src attribute specifies the audio file.',
  '<iframe>': 'Embeds another webpage or content within the current page.',
  '<details>': 'A disclosure widget — content is hidden until the user clicks to expand it.',
  '<summary>': 'The visible label for a <details> element — clicking it toggles the disclosure.',
  '<figure>': 'A self-contained piece of content (image, diagram, code) — often with a <figcaption>.',
  '<figcaption>': 'A caption for a <figure> element — describes the figure\'s content.',
  '<blockquote>': 'A block of quoted content — typically rendered with indentation.',
};

function explainHtmlLine(trimmed) {
  if (!trimmed) return null;

  // HTML comment
  if (trimmed.startsWith('<!--') && trimmed.endsWith('-->')) {
    return `Comment: ${trimmed.slice(4, -3).trim()}`;
  }
  if (trimmed.startsWith('<!--')) {
    return `Comment: ${trimmed.slice(4).trim()}`;
  }

  // Self-closing tags: <img>, <br>, <hr>, <meta>, <link>, <input>
  const selfClosingMatch = trimmed.match(/^<(img|br|hr|meta|link|input)\b([^>]*?)\/?$/);
  if (selfClosingMatch) {
    const [, tag, attrs] = selfClosingMatch;
    const explanation = HTML_TAG_EXPLANATIONS[`<${tag}>`];
    if (tag === 'img') {
      const srcMatch = attrs.match(/src=["']([^"']+)/);
      const altMatch = attrs.match(/alt=["']([^"']+)/);
      let desc = 'An image';
      if (altMatch) desc += ` showing \"${altMatch[1]}\"`;
      if (srcMatch) desc += ` from \"${srcMatch[1]}\"`;
      return desc + '.';
    }
    if (tag === 'input') {
      const typeMatch = attrs.match(/type=["']([^"']+)/);
      const type = typeMatch ? typeMatch[1] : 'text';
      return `An input field of type \"${type}\" — users can enter ${type === 'checkbox' ? 'a toggleable option' : type === 'radio' ? 'a single choice from a group' : type === 'password' ? 'hidden text (password)' : type === 'number' ? 'a numeric value' : type === 'date' ? 'a date' : 'text'}.`;
    }
    return explanation || `A self-closing <${tag}> element.`;
  }

  // Full tags: <tag ...> or </tag>
  const tagMatch = trimmed.match(/^<?\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)>?.*$/);
  if (tagMatch) {
    const [, tag, attrs] = tagMatch;
    const isClosing = trimmed.startsWith('</');

    if (isClosing) return `Closes the <${tag}> element.`;

    const explanation = HTML_TAG_EXPLANATIONS[`<${tag}>`];

    // Extract key attributes
    const idMatch = attrs.match(/id=["']([^"']+)/);
    const classMatch = attrs.match(/class=["']([^"']+)/);
    const hrefMatch = attrs.match(/href=["']([^"']+)/);
    const srcMatch = attrs.match(/src=["']([^"']+)/);
    const altMatch = attrs.match(/alt=["']([^"']+)/);
    const typeMatch = attrs.match(/type=["']([^"']+)/);
    const nameMatch = attrs.match(/name=["']([^"']+)/);
    const forMatch = attrs.match(/for=["']([^"']+)/);

    let desc = explanation || `A <${tag}> element`;

    if (tag === 'a' && hrefMatch) desc = `A link to \"${hrefMatch[1]}\"`;
    if (tag === 'img' && srcMatch) desc = `An image from \"${srcMatch[1]}\"`;
    if (altMatch) desc += ` with alt text \"${altMatch[1]}\"`;
    if (idMatch) desc += `, id \"${idMatch[1]}\"`;
    if (classMatch) desc += `, class \"${classMatch[1]}\"`;
    if (nameMatch && tag !== 'meta') desc += `, name \"${nameMatch[1]}\"`;
    if (forMatch) desc += `, linked to input with id \"${forMatch[1]}\"`;
    if (typeMatch && (tag === 'input' || tag === 'button' || tag === 'ol')) desc += `, type \"${typeMatch[1]}\"`;

    return desc + '.';
  }

  // Plain text content between tags (e.g., inside <p>, <li>, <h1>)
  if (trimmed && !trimmed.startsWith('<')) {
    // This is text content inside a tag — skip it as the parent tag already explained
    return null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Git command explanation
// ---------------------------------------------------------------------------
function explainGitLine(trimmed) {
  if (!trimmed) return null;

  // Strip inline comments
  const withoutComment = trimmed.replace(/#.*$/, '').trim();
  if (!withoutComment) return null;

  const parts = withoutComment.split(/\s+/);
  const cmd = parts[0];
  const sub = parts[1];

  const explanations = {
    'git init': 'Creates a new Git repository in the current folder — starts tracking changes from this point.',
    'git status': 'Shows which files have been modified, staged, or are untracked.',
    'git add': sub ? `Stages \"${sub}\" — tells Git to include this file in the next commit.` : 'Stages files for the next commit.',
    'git commit': sub === '-m' ? `Saves a snapshot with the message \"${parts.slice(2).join(' ')}\".` : 'Saves a snapshot of all staged changes.',
    'git log': sub === '--oneline' ? 'Shows a compact commit history — one line per commit.' : 'Shows the full commit history — author, date, and message for each commit.',
    'git diff': sub === '--staged' ? 'Shows changes between the staging area and the last commit.' : sub && sub.startsWith('HEAD') ? 'Shows changes compared to a specific commit.' : 'Shows changes in your working directory that are not yet staged.',
    'git branch': sub ? `Creates a new branch named \"${sub}\" — an independent line of development.` : 'Lists all branches — the current branch is marked with *.',
    'git switch': sub === '-c' ? `Creates and switches to a new branch named \"${parts[2]}\" in one step.` : sub ? `Switches to branch \"${sub}\" — your working directory updates to match that branch.` : 'Switches to a different branch.',
    'git checkout': sub ? `Switches to \"${sub}\" or restores files.` : 'Switches branches or restores working tree files.',
    'git merge': sub ? `Merges branch \"${sub}\" into the current branch — combines their histories.` : 'Merges a branch into the current branch.',
    'git clone': sub ? `Copies the repository from \"${sub}\" to your machine.` : 'Copies a remote repository to your local machine.',
    'git push': sub && parts[2] ? `Uploads local commits to \"${sub}/${parts[2]}\" on the remote.` : 'Uploads your local commits to the remote repository.',
    'git pull': 'Downloads and integrates changes from the remote repository into your current branch.',
    'git restore': sub === '--staged' ? 'Unstages a file — removes it from the staging area without losing changes.' : 'Discards changes in a file — reverts it to the last committed version.',
  };

  // Check two-word commands first (e.g., "git init")
  const twoWord = `${cmd} ${sub || ''}`.trim();
  if (explanations[twoWord]) return explanations[twoWord];

  // Fallback for single git commands
  if (cmd === 'git' && explanations[`${cmd} ${sub}`]) return explanations[`${cmd} ${sub}`];

  // Generic git command
  if (cmd === 'git') {
    return `Runs the Git command \"${withoutComment.replace(/^git\s*/, '')}\".`;
  }

  return null;
}

export function explainCode(code, language) {
  // If the user clicked Explain on code that came verbatim from one of the
  // built-in templates, swap the generic "this code uses loops, has
  // functions" summary for the hand-written, context-aware one. The
  // line-by-line still comes from the heuristic below — those two layers
  // together give the offline Explain feature an AI-quality opener with
  // structural detail underneath.
  const match = findTemplateMatch(code);
  const bespoke = match ? getTemplateSummary(match.templateName, match.language) : null;
  const summary = bespoke || detectOverallPattern(code, language);

  const lines = code.split('\n');
  const lineByLine = [];

  for (const line of lines) {
    const explanation = explainLine(line, language);
    if (explanation) {
      lineByLine.push({ line: line, explanation });
    }
  }

  return { summary, lineByLine };
}

// Legacy export kept so any code that imports traceSimpleJavaScript directly
// still works. Internally we call the private traceSimpleJS().
export function traceSimpleJavaScript(code) {
  return traceSimpleJS(code);
}

// Language-dispatching entry point used by ActiveLessonCard and any
// future callers that need language-aware tracing.
export function traceCode(code, language) {
  if (language === 'python') return traceSimplePython(code);
  // Default to JS tracer for javascript/typescript/all others that share
  // the C-style for-loop syntax.
  return traceSimpleJS(code);
}

function traceSimpleJS(code) {
  const lines = String(code || '').split('\n');
  const state = {};
  const steps = [];
  const output = [];

  const pushStep = (lineNumber, line, note) => {
    steps.push({
      lineNumber,
      line: line.trim(),
      note,
      state: { ...state },
      output: output.join('\n'),
    });
  };

  const runStatement = (rawLine, lineNumber) => {
    const line = stripTrailingComment(rawLine).trim();
    if (!line) return;

    let match = line.match(/^(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(.+?);?$/);
    if (match) {
      state[match[1]] = evaluateSimpleExpression(match[2], state);
      pushStep(lineNumber, rawLine, `Store ${formatValue(state[match[1]])} in ${match[1]}.`);
      return;
    }

    match = line.match(/^([A-Za-z_$][\w$]*)\s*=\s*(.+?);?$/);
    if (match) {
      state[match[1]] = evaluateSimpleExpression(match[2], state);
      pushStep(lineNumber, rawLine, `Update ${match[1]} to ${formatValue(state[match[1]])}.`);
      return;
    }

    match = line.match(/^([A-Za-z_$][\w$]*)\s*\+=\s*(.+?);?$/);
    if (match) {
      state[match[1]] = (Number(state[match[1]]) || 0) + Number(evaluateSimpleExpression(match[2], state));
      pushStep(lineNumber, rawLine, `Add to ${match[1]}; it is now ${formatValue(state[match[1]])}.`);
      return;
    }

    match = line.match(/^([A-Za-z_$][\w$]*)(\+\+|--);?$/);
    if (match) {
      state[match[1]] = (Number(state[match[1]]) || 0) + (match[2] === '++' ? 1 : -1);
      pushStep(lineNumber, rawLine, `Move ${match[1]} to ${formatValue(state[match[1]])}.`);
      return;
    }

    match = line.match(/^console\.log\((.*)\);?$/);
    if (match) {
      const value = evaluateSimpleExpression(match[1], state);
      output.push(String(value));
      pushStep(lineNumber, rawLine, `Print ${formatValue(value)}.`);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const loop = rawLine.trim().match(/^for\s*\(\s*(?:let|var)?\s*([A-Za-z_$][\w$]*)\s*=\s*([^;]+);\s*\1\s*(<|<=|>|>=)\s*([^;]+);\s*\1\s*(\+\+|--|\+=\s*[^)]+)\s*\)\s*\{?\s*$/);
    if (!loop) {
      runStatement(rawLine, i + 1);
      continue;
    }

    const body = [];
    let end = i + 1;
    for (; end < lines.length; end++) {
      if (lines[end].trim() === '}') break;
      body.push({ line: lines[end], lineNumber: end + 1 });
    }

    const [, name, startExpr, op, limitExpr, updateExpr] = loop;
    state[name] = evaluateSimpleExpression(startExpr, state);
    pushStep(i + 1, rawLine, `Start loop with ${name} = ${formatValue(state[name])}.`);

    let guard = 0;
    while (compareValues(state[name], evaluateSimpleExpression(limitExpr, state), op) && guard < 20) {
      pushStep(i + 1, rawLine, `Loop condition is true (${name} is ${formatValue(state[name])}).`);
      body.forEach((statement) => runStatement(statement.line, statement.lineNumber));
      if (updateExpr === '++') state[name] = (Number(state[name]) || 0) + 1;
      else if (updateExpr === '--') state[name] = (Number(state[name]) || 0) - 1;
      else state[name] = (Number(state[name]) || 0) + Number(evaluateSimpleExpression(updateExpr.replace(/^\+=\s*/, ''), state));
      pushStep(i + 1, rawLine, `Update ${name} to ${formatValue(state[name])}.`);
      guard += 1;
    }
    pushStep(i + 1, rawLine, guard >= 20 ? 'Stopped after 20 iterations.' : 'Loop condition is false, so the loop ends.');
    i = end;
  }

  return { steps, finalState: state, output: output.join('\n') };
}

// ---------------------------------------------------------------------------
// Python-specific tracer
// Understands: plain assignment (x = …), augmented assignment (x += …),
// print(…) calls, and `for VAR in range(start, stop[, step])` loops.
// Returns the same { steps, finalState, output } shape as traceSimpleJS.
// ---------------------------------------------------------------------------
function traceSimplePython(code) {
  const lines = String(code || '').split('\n');
  const state = {};
  const steps = [];
  const outputLines = [];

  const pushStep = (lineNumber, line, note) => {
    steps.push({
      lineNumber,
      line: line.trim(),
      note,
      state: { ...state },
      output: outputLines.join('\n'),
    });
  };

  // Strip Python comments from a line.
  const stripComment = (line) => String(line || '').replace(/\s*#.*$/, '');

  const runStatement = (rawLine, lineNumber) => {
    const line = stripComment(rawLine).trim();
    if (!line) return;

    // print(...)
    let match = line.match(/^print\s*\((.*)\)\s*$/);
    if (match) {
      const value = evaluateSimpleExpression(match[1], state);
      outputLines.push(String(value));
      pushStep(lineNumber, rawLine, `Print ${formatValue(value)}.`);
      return;
    }

    // x += value
    match = line.match(/^([A-Za-z_][\w]*)\s*\+=\s*(.+)$/);
    if (match) {
      state[match[1]] = (Number(state[match[1]]) || 0) + Number(evaluateSimpleExpression(match[2], state));
      pushStep(lineNumber, rawLine, `Add to ${match[1]}; it is now ${formatValue(state[match[1]])}.`);
      return;
    }

    // x -= value
    match = line.match(/^([A-Za-z_][\w]*)\s*-=\s*(.+)$/);
    if (match) {
      state[match[1]] = (Number(state[match[1]]) || 0) - Number(evaluateSimpleExpression(match[2], state));
      pushStep(lineNumber, rawLine, `Subtract from ${match[1]}; it is now ${formatValue(state[match[1]])}.`);
      return;
    }

    // x = value  (plain assignment — must come after augmented-assign checks)
    match = line.match(/^([A-Za-z_][\w]*)\s*=\s*(.+)$/);
    if (match) {
      state[match[1]] = evaluateSimpleExpression(match[2], state);
      pushStep(lineNumber, rawLine, `Store ${formatValue(state[match[1]])} in ${match[1]}.`);
      return;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const stripped = stripComment(rawLine).trim();

    // for VAR in range(stop)
    // for VAR in range(start, stop)
    // for VAR in range(start, stop, step)
    const rangeLoop = stripped.match(/^for\s+([A-Za-z_][\w]*)\s+in\s+range\(([^)]+)\)\s*:/);
    if (rangeLoop) {
      const [, name, argsRaw] = rangeLoop;
      const args = argsRaw.split(',').map((a) => Number(evaluateSimpleExpression(a.trim(), state)));
      let start = 0;
      let stop;
      let step = 1;
      if (args.length === 1) { stop = args[0]; }
      else if (args.length === 2) { [start, stop] = args; }
      else { [start, stop, step] = args; }

      // Collect the indented body lines.
      const body = [];
      let end = i + 1;
      while (end < lines.length) {
        const bodyLine = lines[end];
        if (bodyLine.trim() && !/^\s+/.test(bodyLine) && !bodyLine.startsWith('\t')) break;
        if (bodyLine.trim()) body.push({ line: bodyLine, lineNumber: end + 1 });
        end += 1;
      }

      state[name] = start;
      pushStep(i + 1, rawLine, `Start loop with ${name} = ${formatValue(start)}.`);

      let guard = 0;
      const cond = step > 0 ? (v) => v < stop : (v) => v > stop;
      while (cond(state[name]) && guard < 20) {
        pushStep(i + 1, rawLine, `Loop condition is true (${name} is ${formatValue(state[name])}).`);
        body.forEach((s) => runStatement(s.line, s.lineNumber));
        state[name] = Number(state[name]) + step;
        pushStep(i + 1, rawLine, `Update ${name} to ${formatValue(state[name])}.`);
        guard += 1;
      }
      pushStep(i + 1, rawLine, guard >= 20 ? 'Stopped after 20 iterations.' : 'Loop finished.');
      i = end - 1;
      continue;
    }

    runStatement(rawLine, i + 1);
  }

  return { steps, finalState: state, output: outputLines.join('\n') };
}

function stripTrailingComment(line) {
  return String(line || '').replace(/\s*\/\/.*$/, '');
}

function evaluateSimpleExpression(expr, state) {
  const source = String(expr || '').trim().replace(/;$/, '');
  if (!source) return '';
  if (/[A-Za-z_$][\w$]*\s*\(/.test(source)) return source;
  if (!/^[\w$\s+\-*/%().,'"<>!=&|?]+$/.test(source)) return source;
  try {
    // eslint-disable-next-line no-new-func
    return Function(...Object.keys(state), `"use strict"; return (${source});`)(...Object.values(state));
  } catch {
    return source;
  }
}

function compareValues(left, right, op) {
  if (op === '<') return left < right;
  if (op === '<=') return left <= right;
  if (op === '>') return left > right;
  if (op === '>=') return left >= right;
  return false;
}

function formatValue(value) {
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
}
