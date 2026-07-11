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
  const hasClass = lines.some(l => PATTERNS.classDef[language]?.test(l));
  const hasFunctions = lines.some(l => PATTERNS.functionDef[language]?.test(l));
  const hasLoops = lines.some(l => PATTERNS.forLoop.test(l) || PATTERNS.whileLoop.test(l));
  const hasImports = lines.some(l => PATTERNS.importStatement[language]?.test(l));
  const hasConditionals = lines.some(l => PATTERNS.ifStatement.test(l));

  const parts = [];
  if (hasClass) parts.push('defines a class');
  if (hasFunctions) parts.push('contains function definitions');
  if (hasLoops) parts.push('uses loops');
  if (hasConditionals) parts.push('includes conditional logic');
  if (hasImports) parts.push('imports external modules');

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
    .map((p) => p.trim().replace(/[:=].*$/, '').replace(/^\.\.\./, '').trim())
    .filter(Boolean);
  if (list.length === 0) return ' that takes no parameters';
  if (list.length === 1) return ` that takes one parameter (\`${list[0]}\`)`;
  if (list.length <= 4) return ` that takes ${list.length} parameters (\`${list.join('`, `')}\`)`;
  return ` that takes ${list.length} parameters`;
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
    const shiftMatch = line.match(/<<\s*([^<;]+)/);
    if (parenMatch) arg = parenMatch[1].trim();
    else if (shiftMatch) arg = shiftMatch[1].trim();
    const lit = shortLiteral(arg);
    if (lit) return `Prints ${lit} to the console.`;
    return `Outputs/prints a value to the console.`;
  }

  // Return statement
  if (PATTERNS.returnStatement.test(line)) {
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

  // Closing braces
  if (PATTERNS.closeBrace.test(line)) {
    return `Closes the current code block.`;
  }

  // Opening braces alone
  if (PATTERNS.openBrace.test(line)) {
    return `Opens a new code block.`;
  }

  // Method call
  if (/^\s*\w+\.\w+\s*\(/.test(line)) {
    return `Calls a method on an object — performs an action or retrieves data.`;
  }

  // Constructor / super
  if (/^\s*super\s*\(/.test(line) || /^\s*super\(\)/.test(line)) {
    return `Calls the parent class constructor — initializes inherited properties.`;
  }
  if (/^\s*(self|this)\.\w+\s*=/.test(line)) {
    return `Sets an instance property on the current object.`;
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

  // Generic assignment or expression
  if (/=/.test(line) && !/==/.test(line)) {
    return `Assigns a value — stores data for use later in the program.`;
  }

  return `Executes a statement in the program.`;
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
