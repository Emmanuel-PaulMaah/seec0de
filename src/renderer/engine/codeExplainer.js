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
    return `Imports a module or library for use in this program.`;
  }

  // Class definition
  const classPattern = PATTERNS.classDef[language];
  if (classPattern && classPattern.test(line)) {
    const match = line.match(classPattern);
    const name = match[match.length - 1] || match[1];
    return `Defines a class named "${name}" — a blueprint for creating objects with shared properties and methods.`;
  }

  // Function definition
  const funcPattern = PATTERNS.functionDef[language];
  if (funcPattern && funcPattern.test(line)) {
    const match = line.match(funcPattern);
    const parts = match.filter(Boolean);
    const isAsync = /async/.test(line);
    return `Defines ${isAsync ? 'an asynchronous ' : 'a '}function${parts.length > 1 ? ' named "' + parts[parts.length - 2] + '"' : ''} that can be called to perform a specific task.`;
  }

  // Variable assignment
  const varPattern = PATTERNS.variableAssign[language];
  if (varPattern && varPattern.test(line)) {
    if (language === 'python') {
      const match = line.match(varPattern);
      return `Assigns a value to the variable "${match[1]}". In Python, variables don't need type declarations.`;
    }
    if (language === 'go') {
      const match = line.match(varPattern);
      return `Short variable declaration — creates variable "${match[1]}" with an inferred type.`;
    }
    if (language === 'rust') {
      const isMut = /let\s+mut/.test(line);
      return `Declares a ${isMut ? 'mutable' : 'immutable'} variable binding.`;
    }
    return `Declares and assigns a variable to store a value for later use.`;
  }

  // Print/output
  const printPattern = PATTERNS.printStatement[language];
  if (printPattern && printPattern.test(line)) {
    return `Outputs/prints a value to the console — used for displaying results or debugging.`;
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
  const summary = detectOverallPattern(code, language);
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
