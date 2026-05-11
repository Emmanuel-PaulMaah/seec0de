// One-line explanations for common Windows / cross-platform shell commands.
// Pure data + lookup — no network, no AI. The renderer calls `explain(cmd)`
// with the raw command line, we tokenize it, recognise the program (and
// optionally a subcommand), and return a short human sentence.
//
// Coverage philosophy: catch the things a learner would type while exploring
// — file system basics, npm, git, node, python, dotnet, PowerShell verbs,
// common cmd builtins. Anything we don't know returns `null` so the UI can
// hide the explanation strip cleanly.

const COMMANDS = {
  // ---- file system / shell builtins -------------------------------------
  cd:        'Change the current working directory.',
  pwd:       'Print the current working directory.',
  ls:        'List files and folders in the current directory.',
  dir:       'List files and folders in the current directory (Windows).',
  cls:       'Clear the terminal screen.',
  clear:     'Clear the terminal screen.',
  echo:      'Print text back to the terminal.',
  cat:       'Print the contents of one or more files.',
  type:      'Print the contents of a file (Windows).',
  cp:        'Copy files or folders.',
  copy:      'Copy a file (Windows).',
  mv:        'Move or rename files or folders.',
  move:      'Move a file (Windows).',
  rm:        'Delete files or folders.',
  del:       'Delete a file (Windows).',
  mkdir:     'Create a new directory.',
  md:        'Create a new directory (Windows alias).',
  rmdir:     'Delete an empty directory.',
  rd:        'Delete an empty directory (Windows alias).',
  touch:     'Create an empty file (or update its modified time).',
  whoami:    'Print the current user name.',
  hostname:  'Print this machine\'s hostname.',
  date:      'Print the current date and time.',
  exit:      'Close the terminal session.',
  where:     'Find the full path of an executable on PATH (Windows).',
  which:     'Find the full path of an executable on PATH.',

  // ---- networking / inspection -----------------------------------------
  ping:      'Send ICMP echo requests to test network reachability.',
  curl:      'Make an HTTP request from the terminal.',
  wget:      'Download a file over HTTP/FTP.',
  ipconfig:  'Show network adapter configuration (Windows).',
  ifconfig:  'Show network adapter configuration.',
  netstat:   'Show network connections and listening ports.',
  tasklist:  'List running processes (Windows).',
  taskkill:  'Terminate a running process by name or PID (Windows).',
  ps:        'List running processes.',
  kill:      'Terminate a process by PID.',

  // ---- runtimes ---------------------------------------------------------
  node:      'Run a JavaScript file (or REPL) with Node.js.',
  python:    'Run a Python file (or REPL).',
  python3:   'Run a Python 3 file (or REPL).',
  pip:       'Manage Python packages.',
  pip3:      'Manage Python 3 packages.',
  java:      'Run a compiled Java program.',
  javac:     'Compile Java source to bytecode.',
  go:        'Run a Go command (build, run, test, mod, …).',
  cargo:     'Run a Rust/Cargo command (build, run, test, …).',
  rustc:     'Compile a Rust source file.',
  dotnet:    'Run a .NET CLI command.',
  gcc:       'Compile C source with GCC.',
  'g++':     'Compile C++ source with g++.',
  clang:     'Compile C source with Clang.',
  'clang++': 'Compile C++ source with clang++.',
  cl:        'Compile C/C++ with the MSVC compiler (Windows).',
};

// Subcommand-aware programs: `program subcommand` → explanation.
const SUBCOMMANDS = {
  npm: {
    install:  'Install dependencies listed in package.json (or a specific package).',
    i:        'Install dependencies (short for `npm install`).',
    run:      'Run a script defined in package.json.',
    start:    'Run the project\'s `start` script.',
    test:     'Run the project\'s `test` script.',
    init:     'Create a new package.json in the current directory.',
    update:   'Update installed dependencies to allowed versions.',
    uninstall:'Remove a dependency from this project.',
    ci:       'Install dependencies from the lockfile, clean.',
    publish:  'Publish this package to the registry.',
    audit:    'Scan dependencies for known vulnerabilities.',
    list:     'Print the dependency tree of this project.',
    ls:       'Print the dependency tree of this project.',
    outdated: 'Show packages that have newer versions available.',
  },
  pnpm: {
    install: 'Install dependencies (pnpm).', i: 'Install dependencies (pnpm).',
    add: 'Add a package as a dependency.', run: 'Run a package.json script.',
  },
  yarn: {
    install: 'Install dependencies (Yarn).', add: 'Add a package as a dependency.',
    remove: 'Remove a dependency.', run: 'Run a package.json script.',
  },
  git: {
    init:    'Create a new empty Git repository here.',
    clone:   'Copy a remote Git repository onto your machine.',
    status:  'Show what\'s changed since the last commit.',
    add:     'Stage changes for the next commit.',
    commit:  'Save the staged changes as a commit.',
    push:    'Send local commits to the remote repository.',
    pull:    'Fetch and merge changes from the remote.',
    fetch:   'Download remote commits without merging.',
    branch:  'List, create, or delete branches.',
    checkout:'Switch branches or restore files.',
    switch:  'Switch to a different branch.',
    merge:   'Combine another branch into the current one.',
    rebase:  'Reapply commits on top of another branch.',
    log:     'Show the commit history.',
    diff:    'Show changes between commits, branches, or files.',
    reset:   'Move HEAD and optionally the index/worktree.',
    restore: 'Discard or unstage changes in the working tree.',
    stash:   'Set aside uncommitted changes for later.',
    tag:     'List, create, or delete version tags.',
    remote:  'Manage tracked remote repositories.',
  },
  docker: {
    run:    'Start a new container from an image.',
    build:  'Build a Docker image from a Dockerfile.',
    ps:     'List running containers.',
    images: 'List local images.',
    pull:   'Download an image from a registry.',
    push:   'Upload an image to a registry.',
    exec:   'Run a command inside a running container.',
    stop:   'Stop a running container.',
    rm:     'Delete a stopped container.',
    rmi:    'Delete a local image.',
  },
  go: {
    run:   'Compile and run a Go program in one step.',
    build: 'Compile a Go program to a binary.',
    test:  'Run tests in the current Go package.',
    mod:   'Manage the Go module (init, tidy, download…).',
    get:   'Add a dependency to the current Go module.',
    install:'Compile and install a Go binary onto your system.',
  },
  cargo: {
    run:    'Compile and run the current Rust crate.',
    build:  'Compile the current Rust crate.',
    test:   'Run the crate\'s tests.',
    new:    'Create a new Rust project.',
    add:    'Add a dependency to Cargo.toml.',
    update: 'Update locked dependencies.',
    check:  'Type-check the crate without producing a binary.',
  },
  dotnet: {
    run:     'Run the .NET project in the current folder.',
    build:   'Compile the .NET project.',
    test:    'Run tests in the .NET solution.',
    new:     'Create a new .NET project from a template.',
    publish: 'Produce a deployable build of the project.',
    restore: 'Download NuGet dependencies.',
  },
};

// Recognise PowerShell Verb-Noun cmdlets even when not in the table.
function explainPowerShellVerb(token) {
  const m = token.match(/^([A-Z][a-z]+)-([A-Z][A-Za-z0-9]+)$/);
  if (!m) return null;
  const verb = m[1];
  const noun = m[2];
  const verbHints = {
    Get:    `Read or query ${noun.toLowerCase()} information.`,
    Set:    `Change a ${noun.toLowerCase()} setting or value.`,
    New:    `Create a new ${noun.toLowerCase()}.`,
    Remove: `Delete a ${noun.toLowerCase()}.`,
    Start:  `Start a ${noun.toLowerCase()}.`,
    Stop:   `Stop a ${noun.toLowerCase()}.`,
    Test:   `Test or check a ${noun.toLowerCase()}.`,
    Invoke: `Run or trigger a ${noun.toLowerCase()}.`,
    Out:    `Send output to ${noun.toLowerCase()}.`,
    Select: `Pick fields from ${noun.toLowerCase()} objects.`,
    Where:  `Filter ${noun.toLowerCase()} objects.`,
    ForEach:`Loop over ${noun.toLowerCase()} objects.`,
    Import: `Load a ${noun.toLowerCase()} into the session.`,
    Export: `Save a ${noun.toLowerCase()} to disk.`,
  };
  return verbHints[verb] || `PowerShell cmdlet: ${verb} a ${noun.toLowerCase()}.`;
}

// Tokenise respecting basic quoting — good enough for explanations.
function tokenize(line) {
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    out.push(m[1] ?? m[2] ?? m[3]);
  }
  return out;
}

export function explain(line) {
  const trimmed = (line || '').trim();
  if (!trimmed) return null;
  // Strip leading env assignments like `FOO=bar npm test`.
  const tokens = tokenize(trimmed).filter((t) => !/^[A-Z_][A-Z0-9_]*=/.test(t));
  if (!tokens.length) return null;

  const program = tokens[0];
  const sub     = tokens[1];

  // Subcommand-aware lookup first.
  const subTable = SUBCOMMANDS[program.toLowerCase()];
  if (subTable && sub && subTable[sub.toLowerCase()]) {
    return subTable[sub.toLowerCase()];
  }

  // Direct lookup (case-insensitive).
  const direct = COMMANDS[program.toLowerCase()];
  if (direct) return direct;

  // PowerShell Verb-Noun fallback.
  const ps = explainPowerShellVerb(program);
  if (ps) return ps;

  return null;
}
