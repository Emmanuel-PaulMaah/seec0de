// gitSandbox — a virtual Git repository state machine.
//
// Maintains an in-memory representation of a Git repo (working tree,
// staging area, commits, branches, remotes) and processes Git commands,
// returning realistic output strings. Nothing touches the real filesystem.

const INITIAL_BRANCH = 'main';

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function shortHash() {
  return generateId().slice(0, 7);
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${d.getFullYear()}`;
}

function createCommit(message, files, author) {
  return {
    hash: generateId(),
    shortHash: shortHash(),
    message,
    timestamp: timestamp(),
    files: { ...files },
    author: author || 'You <you@example.com>',
  };
}

export function createGitSandbox() {
  let initialized = false;
  let cwd = '~/my-project';
  let files = {};           // working tree: { 'path': 'content' }
  let staging = {};         // staged files snapshot at last add
  let commits = [];         // array of commit objects
  let branches = {};        // { name: commitIndex }
  let currentBranch = INITIAL_BRANCH;
  let headIndex = -1;       // index into commits[] for HEAD
  let remotes = {};         // { origin: { url, refs } }

  function getHeadCommit() {
    if (headIndex < 0 || headIndex >= commits.length) return null;
    return commits[headIndex];
  }

  function getBranchRef(branch) {
    const idx = branches[branch];
    if (idx === undefined) return null;
    return idx;
  }

  function cloneFiles() {
    const snapshot = {};
    for (const [k, v] of Object.entries(files)) snapshot[k] = v;
    return snapshot;
  }

  function cloneStaging() {
    const snapshot = {};
    for (const [k, v] of Object.entries(staging)) snapshot[k] = v;
    return snapshot;
  }

  function diffWorkingVsCommit(commitFiles) {
    const changes = [];
    const allPaths = new Set([...Object.keys(files), ...Object.keys(commitFiles)]);
    for (const path of allPaths) {
      const inWorking = path in files;
      const inCommit = path in commitFiles;
      if (inWorking && !inCommit) {
        changes.push({ path, status: 'new file' });
      } else if (!inWorking && inCommit) {
        changes.push({ path, status: 'deleted' });
      } else if (files[path] !== commitFiles[path]) {
        changes.push({ path, status: 'modified' });
      }
    }
    return changes;
  }

  function diffStagingVsCommit(commitFiles) {
    const changes = [];
    const allPaths = new Set([...Object.keys(staging), ...Object.keys(commitFiles)]);
    for (const path of allPaths) {
      const inStaging = path in staging;
      const inCommit = path in commitFiles;
      if (inStaging && !inCommit) {
        changes.push({ path, status: 'new file' });
      } else if (!inStaging && inCommit) {
        changes.push({ path, status: 'deleted' });
      } else if (inStaging && staging[path] !== commitFiles[path]) {
        changes.push({ path, status: 'modified' });
      }
    }
    return changes;
  }

  function diffWorkingVsStaging() {
    const changes = [];
    const allPaths = new Set([...Object.keys(files), ...Object.keys(staging)]);
    for (const path of allPaths) {
      const inWorking = path in files;
      const inStaging = path in staging;
      if (inWorking && !inStaging) {
        // new file not yet staged — skip for unstaged diff
      } else if (!inWorking && inStaging) {
        changes.push({ path, status: 'deleted' });
      } else if (inWorking && inStaging && files[path] !== staging[path]) {
        changes.push({ path, status: 'modified' });
      }
    }
    return changes;
  }

  // ------------------------------------------------------------------
  // Command handlers
  // ------------------------------------------------------------------

  function cmdInit() {
    if (initialized) {
      return { stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git\n', exitCode: 128 };
    }
    initialized = true;
    branches = { [INITIAL_BRANCH]: -1 };
    currentBranch = INITIAL_BRANCH;
    headIndex = -1;
    return { stdout: `Initialized empty Git repository in ${cwd}/.git/\n`, stderr: '', exitCode: 0 };
  }

  function cmdStatus() {
    if (!initialized) {
      return { stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git\n', exitCode: 128 };
    }
    const head = getHeadCommit();
    const headFiles = head ? head.files : {};

    const stagedNew = [];
    const stagedModified = [];
    const stagedDeleted = [];
    const unstagedModified = [];
    const untracked = [];

    // Check staged changes vs HEAD
    const stagedChanges = diffStagingVsCommit(headFiles);
    for (const c of stagedChanges) {
      if (c.status === 'new file') stagedNew.push(c.path);
      else if (c.status === 'modified') stagedModified.push(c.path);
      else if (c.status === 'deleted') stagedDeleted.push(c.path);
    }

    // Check unstaged changes (working vs staging)
    const unstagedChanges = diffWorkingVsStaging();
    for (const c of unstagedChanges) {
      if (c.status === 'modified') unstagedModified.push(c.path);
      else if (c.status === 'deleted') unstagedModified.push(c.path); // treat as modified
    }

    // Check untracked files
    for (const path of Object.keys(files)) {
      if (!(path in staging)) {
        untracked.push(path);
      }
    }

    let out = `On branch ${currentBranch}\n`;
    if (commits.length === 0) {
      out += '\nNo commits yet\n';
    }

    const hasStaged = stagedNew.length || stagedModified.length || stagedDeleted.length;
    const hasUnstaged = unstagedModified.length;
    const hasUntracked = untracked.length;

    if (!hasStaged && !hasUnstaged && !hasUntracked && commits.length > 0) {
      out += '\nnothing to commit, working tree clean\n';
      return { stdout: out, stderr: '', exitCode: 0 };
    }

    if (hasStaged) {
      out += '\nChanges to be committed:\n';
      out += '  (use "git restore --staged <file>..." to unstage)\n';
      for (const f of stagedNew) out += `\tnew file:   ${f}\n`;
      for (const f of stagedModified) out += `\tmodified:   ${f}\n`;
      for (const f of stagedDeleted) out += `\tdeleted:    ${f}\n`;
    }

    if (hasUnstaged) {
      out += '\nChanges not staged for commit:\n';
      out += '  (use "git add <file>..." to update what will be committed)\n';
      for (const f of unstagedModified) out += `\tmodified:   ${f}\n`;
    }

    if (hasUntracked) {
      out += '\nUntracked files:\n';
      out += '  (use "git add <file>..." to include in what will be committed)\n';
      for (const f of untracked) out += `\t${f}\n`;
    }

    return { stdout: out, stderr: '', exitCode: 0 };
  }

  function cmdAdd(args) {
    if (!initialized) {
      return { stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git\n', exitCode: 128 };
    }
    if (args.length === 0) {
      return { stdout: '', stderr: 'fatal: no pathspec(s) given\n', exitCode: 128 };
    }
    const target = args[0];
    if (target === '.' || target === './') {
      // Stage all tracked files
      for (const [path, content] of Object.entries(files)) {
        staging[path] = content;
      }
      return { stdout: '', stderr: '', exitCode: 0 };
    }
    // Stage specific file
    if (files[target] !== undefined) {
      staging[target] = files[target];
      return { stdout: '', stderr: '', exitCode: 0 };
    }
    return { stdout: '', stderr: `fatal: pathspec '${target}' did not match any files\n`, exitCode: 128 };
  }

  function cmdCommit(args) {
    if (!initialized) {
      return { stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git\n', exitCode: 128 };
    }
    const stagingKeys = Object.keys(staging);
    if (stagingKeys.length === 0 && headIndex >= 0) {
      return { stdout: '', stderr: 'nothing to commit\n', exitCode: 0 };
    }
    // Parse -m flag
    let message = '';
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-m' && args[i + 1]) {
        message = args[i + 1];
        break;
      }
    }
    if (!message) {
      return { stdout: '', stderr: 'Aborting commit due to empty commit message.\n', exitCode: 1 };
    }

    const commit = createCommit(message, cloneStaging());
    commits.push(commit);
    headIndex = commits.length - 1;
    branches[currentBranch] = headIndex;
    // Staging area is now clean (matches HEAD)
    staging = cloneStaging();

    const count = Object.keys(commit.files).length;
    return {
      stdout: `[${currentBranch} ${commit.shortHash}] ${message}\n ${count} file${count !== 1 ? 's' : ''} changed\n`,
      stderr: '',
      exitCode: 0,
    };
  }

  function cmdLog() {
    if (!initialized) {
      return { stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git\n', exitCode: 128 };
    }
    if (commits.length === 0) {
      return { stdout: 'warning: random Log file found: .git/logs/HEAD\nfatal: bad default revision \'HEAD\'\n', stderr: '', exitCode: 128 };
    }
    let out = '';
    const branchRef = getBranchRef(currentBranch);
    for (let i = commits.length - 1; i >= 0; i--) {
      const c = commits[i];
      const isHead = i === headIndex;
      const marker = isHead ? ' (HEAD -> ' + currentBranch + ')' : (i === branchRef ? ' (' + currentBranch + ')' : '');
      out += `commit ${c.hash}${marker}\n`;
      out += `Author: ${c.author}\n`;
      out += `Date:   ${c.timestamp}\n\n`;
      out += `    ${c.message}\n\n`;
    }
    return { stdout: out, stderr: '', exitCode: 0 };
  }

  function cmdDiff(args) {
    if (!initialized) {
      return { stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git\n', exitCode: 128 };
    }
    const head = getHeadCommit();
    const headFiles = head ? head.files : {};

    // Simple diff: working tree vs HEAD
    let out = '';
    const changes = diffWorkingVsCommit(headFiles);
    if (changes.length === 0) {
      return { stdout: '', stderr: '', exitCode: 0 };
    }
    for (const c of changes) {
      out += `diff --git a/${c.path} b/${c.path}\n`;
      if (c.status === 'new file') {
        out += `new file mode 100644\n`;
        out += `--- /dev/null\n`;
        out += `+++ b/${c.path}\n`;
        out += `@@ -0, +1 @@\n`;
        out += `+${files[c.path]}\n`;
      } else if (c.status === 'deleted') {
        out += `deleted file mode 100644\n`;
        out += `--- a/${c.path}\n`;
        out += `+++ /dev/null\n`;
        out += `@@ -1, +0 @@\n`;
        out += `-${headFiles[c.path]}\n`;
      } else {
        out += `--- a/${c.path}\n`;
        out += `+++ b/${c.path}\n`;
        out += `@@ -1, +1 @@\n`;
        out += `-${headFiles[c.path]}\n`;
        out += `+${files[c.path]}\n`;
      }
    }
    return { stdout: out, stderr: '', exitCode: 0 };
  }

  function cmdBranch(args) {
    if (!initialized) {
      return { stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git\n', exitCode: 128 };
    }
    if (args.length === 0) {
      let out = '';
      for (const name of Object.keys(branches)) {
        const marker = name === currentBranch ? '* ' : '  ';
        out += `${marker}${name}\n`;
      }
      return { stdout: out, stderr: '', exitCode: 0 };
    }
    // Create new branch
    const name = args[0];
    if (branches[name] !== undefined) {
      return { stdout: '', stderr: `fatal: a branch named '${name}' already exists.\n`, exitCode: 128 };
    }
    branches[name] = headIndex;
    return { stdout: '', stderr: '', exitCode: 0 };
  }

  function cmdCheckout(args) {
    if (!initialized) {
      return { stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git\n', exitCode: 128 };
    }
    if (args.length === 0) {
      return { stdout: '', stderr: 'error: pathspec \'\' did not match any file(s) known to git\n', exitCode: 1 };
    }
    const name = args[0];
    if (branches[name] === undefined) {
      return { stdout: '', stderr: `error: pathspec '${name}' did not match any file(s) known to git\n`, exitCode: 1 };
    }
    currentBranch = name;
    headIndex = branches[name];
    // Restore working tree and staging to HEAD
    const head = getHeadCommit();
    if (head) {
      files = cloneFiles(head.files);
      staging = cloneFiles(head.files);
    } else {
      files = {};
      staging = {};
    }
    return { stdout: `Switched to branch '${name}'\n`, stderr: '', exitCode: 0 };
  }

  function cmdSwitch(args) {
    return cmdCheckout(args);
  }

  function cmdMerge(args) {
    if (!initialized) {
      return { stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git\n', exitCode: 128 };
    }
    if (args.length === 0) {
      return { stdout: '', stderr: 'fatal: no branch specified\n', exitCode: 128 };
    }
    const source = args[0];
    if (branches[source] === undefined) {
      return { stdout: '', stderr: `fatal: '${source}' is not a commit and a branch '${source}' cannot be created from it\n`, exitCode: 128 };
    }
    if (source === currentBranch) {
      return { stdout: `Already up to date.\n`, stderr: '', exitCode: 0 };
    }
    const sourceIdx = branches[source];
    const sourceCommit = commits[sourceIdx];
    if (!sourceCommit) {
      return { stdout: `Already up to date.\n`, stderr: '', exitCode: 0 };
    }
    // Merge: update current branch to source commit
    const headIdx = getBranchRef(currentBranch);
    if (sourceIdx === headIdx) {
      return { stdout: `Already up to date.\n`, stderr: '', exitCode: 0 };
    }
    // Create a merge commit
    const mergeCommit = createCommit(`Merge branch '${source}' into ${currentBranch}`, cloneFiles(sourceCommit.files));
    commits.push(mergeCommit);
    headIndex = commits.length - 1;
    branches[currentBranch] = headIndex;
    files = cloneFiles(sourceCommit.files);
    staging = cloneFiles(sourceCommit.files);
    return {
      stdout: `Updating ${headIdx >= 0 ? commits[headIdx].shortHash.slice(0, 7) : '0000000'}..${mergeCommit.shortHash}\nFast-forward\n`,
      stderr: '',
      exitCode: 0,
    };
  }

  function cmdClone(args) {
    if (args.length === 0) {
      return { stdout: '', stderr: 'fatal: repository URL not specified\n', exitCode: 128 };
    }
    const url = args[0];
    const repoName = url.split('/').pop().replace('.git', '');
    // Simulate cloning — set up remote
    initialized = true;
    remotes = { origin: { url, refs: { main: 0 } } };
    cwd = `~/${repoName}`;
    return {
      stdout: `Cloning into '${repoName}'...\nremote: Enumerating objects: 12, done.\nremote: Counting objects: 100% (12/12), done.\nremote: Compressing objects: 100% (8/8), done.\nremote: Total 12 (delta 2), reused 10 (delta 1), pack-reused 0\nReceiving objects: 100% (12/12), 2.5 KiB | 2.5 MiB/s, done.\nResolving deltas: 100% (2/2), done.\n`,
      stderr: '',
      exitCode: 0,
    };
  }

  function cmdPush(args) {
    if (!initialized) {
      return { stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git\n', exitCode: 128 };
    }
    if (Object.keys(remotes).length === 0) {
      return { stdout: '', stderr: 'fatal: No configured push destination.\n', exitCode: 128 };
    }
    const remote = remotes.origin;
    return {
      stdout: `Enumerating objects: 5, done.\nCounting objects: 100% (5/5), done.\nDelta compression using up to 8 threads\nCompressing objects: 100% (3/3), done.\nWriting objects: 100% (3/3), 1.2 KiB | 1.2 KiB/s, done.\nTotal 3 (delta 1), reused 0 (delta 0), pack-reused 0\nremote: Resolving deltas: 100% (1/1), done.\nTo ${remote.url}\n   a1b2c3d..e4f5g6h  ${currentBranch} -> ${currentBranch}\n`,
      stderr: '',
      exitCode: 0,
    };
  }

  function cmdPull(args) {
    if (!initialized) {
      return { stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git\n', exitCode: 128 };
    }
    if (Object.keys(remotes).length === 0) {
      return { stdout: '', stderr: "fatal: couldn't find remote ref main\n", exitCode: 128 };
    }
    return {
      stdout: `remote: Enumerating objects: 4, done.\nremote: Counting objects: 100% (4/4), done.\nremote: Compressing objects: 100% (2/2), done.\nremote: Total 2 (delta 1), reused 2 (delta 1), pack-reused 0\nUnpacking objects: 100% (2/2), 1.1 KiB | 1.1 KiB/s, done.\nFrom https://github.com/example/repo\n   a1b2c3d..e4f5g6h  main       -> origin/main\nUpdating a1b2c3d..e4f5g6h\nFast-forward\n`,
      stderr: '',
      exitCode: 0,
    };
  }

  function cmdFetch() {
    if (!initialized) {
      return { stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git\n', exitCode: 128 };
    }
    return {
      stdout: `remote: Enumerating objects: 4, done.\nremote: Counting objects: 100% (4/4), done.\nremote: Compressing objects: 100% (2/2), done.\nremote: Total 2 (delta 1), reused 2 (delta 1), pack-reused 0\nUnpacking objects: 100% (2/2), 1.1 KiB | 1.1 KiB/s, done.\nFrom https://github.com/example/repo\n   a1b2c3d..e4f5g6h  main       -> origin/main\n`,
      stderr: '',
      exitCode: 0,
    };
  }

  function cmdRemote(args) {
    if (!initialized) {
      return { stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git\n', exitCode: 128 };
    }
    if (args[0] === '-v' || args[0] === '--verbose') {
      let out = '';
      for (const [name, remote] of Object.entries(remotes)) {
        out += `${name}\t${remote.url} (fetch)\n`;
        out += `${name}\t${remote.url} (push)\n`;
      }
      return { stdout: out || '', stderr: '', exitCode: 0 };
    }
    return { stdout: Object.keys(remotes).join('\n') + '\n', stderr: '', exitCode: 0 };
  }

  function cmdReset(args) {
    if (!initialized) {
      return { stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git\n', exitCode: 128 };
    }
    const head = getHeadCommit();
    if (head) {
      files = cloneFiles(head.files);
      staging = cloneFiles(head.files);
    }
    return { stdout: '', stderr: '', exitCode: 0 };
  }

  function cmdRestore(args) {
    if (!initialized) {
      return { stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git\n', exitCode: 128 };
    }
    // --staged flag
    const isStaged = args.includes('--staged');
    const filesArgs = args.filter(a => a !== '--staged' && a !== '--source');
    if (filesArgs.length === 0) {
      return { stdout: '', stderr: 'fatal: no paths specified\n', exitCode: 128 };
    }
    for (const f of filesArgs) {
      if (isStaged) {
        delete staging[f];
      } else {
        const head = getHeadCommit();
        if (head && head.files[f] !== undefined) {
          files[f] = head.files[f];
        } else {
          delete files[f];
        }
      }
    }
    return { stdout: '', stderr: '', exitCode: 0 };
  }

  function cmdStash(args) {
    if (!initialized) {
      return { stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git\n', exitCode: 128 };
    }
    if (args.length === 0 || args[0] === 'push') {
      return { stdout: `Saved working directory and index state WIP on ${currentBranch}: ${getHeadCommit()?.shortHash || '0000000'}\nHEAD is now at ${getHeadCommit()?.shortHash || '0000000'} ${getHeadCommit()?.message || ''}\n`, stderr: '', exitCode: 0 };
    }
    if (args[0] === 'pop') {
      return { stdout: `On branch ${currentBranch}\nnothing to commit, working tree clean\n`, stderr: '', exitCode: 0 };
    }
    if (args[0] === 'list') {
      return { stdout: 'stash@{0}: WIP on main: 0000000 initial commit\n', stderr: '', exitCode: 0 };
    }
    return { stdout: '', stderr: '', exitCode: 0 };
  }

  function cmdTag(args) {
    if (!initialized) {
      return { stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git\n', exitCode: 128 };
    }
    if (args.length === 0) {
      return { stdout: '', stderr: '', exitCode: 0 };
    }
    return { stdout: `[${currentBranch} ${getHeadCommit()?.shortHash || '0000000'}] Tag ${args[0]}\n`, stderr: '', exitCode: 0 };
  }

  // ---- Virtual filesystem commands for learning context ----
  function cmdLs(args) {
    const path = args[0] || '';
    if (path === '.git') {
      return { stdout: 'HEAD  config  description  hooks  info  objects  refs\n', stderr: '', exitCode: 0 };
    }
    const entries = Object.keys(files);
    if (entries.length === 0) {
      return { stdout: '', stderr: '', exitCode: 0 };
    }
    return { stdout: entries.join('\n') + '\n', stderr: '', exitCode: 0 };
  }

  function cmdCat(args) {
    if (args.length === 0) {
      return { stdout: '', stderr: 'cat: missing file operand\n', exitCode: 1 };
    }
    const f = args[0];
    if (files[f] !== undefined) {
      return { stdout: files[f] + '\n', stderr: '', exitCode: 0 };
    }
    return { stdout: '', stderr: `cat: ${f}: No such file or directory\n`, exitCode: 1 };
  }

  function cmdTouch(args) {
    if (args.length === 0) {
      return { stdout: '', stderr: 'touch: missing file operand\n', exitCode: 1 };
    }
    files[args[0]] = '';
    return { stdout: '', stderr: '', exitCode: 0 };
  }

  function cmdEcho(args) {
    // echo "content" > file
    const full = args.join(' ');
    const redirectMatch = full.match(/^(.+?)\s*>\s*(.+)$/);
    if (redirectMatch) {
      const content = redirectMatch[1].replace(/^["']|["']$/g, '');
      const file = redirectMatch[2].trim();
      files[file] = content;
      return { stdout: '', stderr: '', exitCode: 0 };
    }
    return { stdout: args.join(' ') + '\n', stderr: '', exitCode: 0 };
  }

  // ------------------------------------------------------------------
  // Main entry
  // ------------------------------------------------------------------

  function execute(rawCommand) {
    const trimmed = (rawCommand || '').trim();
    if (!trimmed) return { stdout: '', stderr: '', exitCode: 0 };

    // Tokenize respecting quotes
    const tokens = [];
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let m;
    while ((m = re.exec(trimmed)) !== null) {
      tokens.push(m[1] ?? m[2] ?? m[3]);
    }
    if (tokens.length === 0) return { stdout: '', stderr: '', exitCode: 0 };

    const program = tokens[0].toLowerCase();
    const args = tokens.slice(1);

    // Route to handler
    switch (program) {
      case 'git': {
        const sub = (args[0] || '').toLowerCase();
        const subArgs = args.slice(1);
        switch (sub) {
          case 'init': return cmdInit();
          case 'status': case 'st': return cmdStatus();
          case 'add': return cmdAdd(subArgs);
          case 'commit': return cmdCommit(subArgs);
          case 'log': case 'lg': return cmdLog();
          case 'diff': case 'di': return cmdDiff(subArgs);
          case 'branch': case 'br': return cmdBranch(subArgs);
          case 'checkout': case 'co': return cmdCheckout(subArgs);
          case 'switch': return cmdSwitch(subArgs);
          case 'merge': return cmdMerge(subArgs);
          case 'clone': return cmdClone(subArgs);
          case 'push': return cmdPush(subArgs);
          case 'pull': return cmdPull(subArgs);
          case 'fetch': return cmdFetch();
          case 'remote': return cmdRemote(subArgs);
          case 'reset': return cmdReset(subArgs);
          case 'restore': return cmdRestore(subArgs);
          case 'stash': return cmdStash(subArgs);
          case 'tag': return cmdTag(subArgs);
          case 'help': return { stdout: 'usage: git <command> [<args>]\n\nAvailable commands:\n  init, status, add, commit, log, diff, branch,\n  checkout, switch, merge, clone, push, pull,\n  fetch, remote, reset, restore, stash, tag\n', stderr: '', exitCode: 0 };
          default: return { stdout: '', stderr: `git: '${sub}' is not a git command. See 'git help'.\n`, exitCode: 1 };
        }
      }
      case 'ls': case 'dir': case 'ls -la': return cmdLs(args);
      case 'cat': case 'type': return cmdCat(args);
      case 'touch': return cmdTouch(args);
      case 'echo': return cmdEcho(args);
      case 'pwd': return { stdout: cwd + '\n', stderr: '', exitCode: 0 };
      case 'cd': return { stdout: '', stderr: '', exitCode: 0 };
      case 'clear': case 'cls': return { stdout: '', stderr: '', exitCode: 0, clear: true };
      case 'help': return { stdout: 'This is a sandboxed learning terminal for Git.\nType "git help" to see available Git commands.\nYou can also use: ls, cat, touch, echo, pwd\n', stderr: '', exitCode: 0 };
      default: return { stdout: `seec0de sandbox: command '${program}' is not available in this learning terminal.\nType "help" for available commands.\n`, stderr: '', exitCode: 1 };
    }
  }

  function getState() {
    return {
      initialized,
      cwd,
      files: cloneFiles(files),
      staging: cloneStaging(),
      commits: commits.map(c => ({ ...c, files: { ...c.files } })),
      branches: { ...branches },
      currentBranch,
      headIndex,
      remotes: { ...remotes },
    };
  }

  function reset(newCwd) {
    initialized = false;
    cwd = newCwd || '~/my-project';
    files = {};
    staging = {};
    commits = [];
    branches = {};
    currentBranch = INITIAL_BRANCH;
    headIndex = -1;
    remotes = {};
  }

  function setCwd(newCwd) {
    cwd = newCwd;
    return { cwd };
  }

  return { execute, getState, reset, setCwd };
}
