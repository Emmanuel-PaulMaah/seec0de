// buildVerifier — checks a build step against the learner's actual files.
//
// A build step (data/buildProjects.js) declares a `checks` array. Each
// check is one of:
//   - fileExists(file)                         — the file is present
//   - fileContains(file, pattern, count)       — regex (or literal) present, at least `count` times (default 1)
//   - fileCount(file, pattern, atLeast/atMost) — count occurrences within a range
//   - fileMissing(file, pattern)               — pattern must be absent
//   - hasFunction(file, name)                  — `function name` / `def name` present
//   - runOutput(file, expect, match)           — run the file, compare stdout (reuses lessonVerifier)
//   - runPasses(file)                          — run the file, must exit cleanly
//   - runCommand(command, expect, match)       — run a shell command in the project
//                                                folder, compare stdout (e.g. verify
//                                                an npm package installed)
//
// Content checks read the live editor buffer via the `resolveFile` resolver
// (App.jsx supplies it: open tab content first, disk fallback). Output
// checks need a `output` object shaped like the runner result
// ({ stdout, stderr, exitCode }) — pass null until the learner actually runs.
// runCommand checks need an `execCommand` function (App.jsx supplies the
// terminal bridge) — pass null to mark them pending.
//
// evaluateStep(step, { resolveFile, output, contentOnly, execCommand }) →
//   { pass, details: [{ id, pass, pending, message }] }
// `contentOnly` skips blocking checks (marked pending) so the UI can show
// "code shape looks right — press Run" before the learner runs.

import { verifyLessonOutput } from './lessonVerifier';

// Blocking checks are the step's real gate: they prove the code does what the
// task asked. Content checks (fileContains, hasFunction, …) are advisory —
// they give specific "you're missing this" feedback, but a functionally
// correct implementation that solves the problem a different way must not be
// blocked just because it lacks a particular pattern.
const BLOCKING_TYPES = new Set(['runOutput', 'runPasses', 'runCommand']);

function countMatches(content, pattern) {
  try {
    return (content.match(new RegExp(pattern, 'g')) || []).length;
  } catch {
    return -1;
  }
}

async function evaluateCheck(check, { resolveFile, output, execCommand }) {
  const id = check.id || check.type;
  const file = check.file;
  const content = file ? await resolveFile(file) : null;

  switch (check.type) {
    case 'fileExists':
      return {
        id,
        pass: content != null,
        message: content != null ? '' : `Create ${file} first.`,
      };

    case 'fileContains': {
      if (content == null) return { id, pass: false, message: `Create ${file} first.` };
      const n = check.mode === 'string'
        ? (content.includes(check.pattern) ? 1 : 0)
        : countMatches(content, check.pattern);
      const need = check.count ?? 1;
      const pass = n >= need;
      return {
        id,
        pass,
        message: pass ? '' : `Expected at least ${need} match(es) of ${check.pattern} in ${file} (found ${n}).`,
      };
    }

    case 'fileCount': {
      if (content == null) return { id, pass: false, message: `Create ${file} first.` };
      const n = countMatches(content, check.pattern);
      const pass =
        (check.atLeast == null || n >= check.atLeast) &&
        (check.atMost == null || n <= check.atMost);
      return {
        id,
        pass,
        message: pass ? '' : `Found ${n} match(es) of ${check.pattern} in ${file} (need ${check.atLeast ?? 'any'}–${check.atMost ?? 'any'}).`,
      };
    }

    case 'fileMissing': {
      if (content == null) return { id, pass: true, message: '' };
      const pass = countMatches(content, check.pattern) === 0;
      return { id, pass, message: pass ? '' : `Remove ${check.pattern} from ${file}.` };
    }

    case 'hasFunction': {
      if (content == null) return { id, pass: false, message: `Create ${file} first.` };
      const pass = new RegExp(`(?:function\\s+|def\\s+)${check.name}\\b`).test(content);
      return { id, pass, message: pass ? '' : `Define ${check.name} in ${file}.` };
    }

    case 'runOutput': {
      if (!output) return { id, pass: false, pending: true, message: 'Press Run to check the output.' };
      const verdict = verifyLessonOutput(output, {
        expectedOutput: check.expect,
        matchType: check.match || 'contains',
      });
      return { id, pass: verdict.pass, message: verdict.pass ? '' : verdict.reason };
    }

    case 'runPasses': {
      if (!output) return { id, pass: false, pending: true, message: 'Press Run to check the output.' };
      const pass = output.exitCode === 0 && !(output.stderr || '').trim();
      return { id, pass, message: pass ? '' : 'Your code did not run cleanly — check the Console.' };
    }

    case 'runCommand': {
      if (!execCommand) return { id, pass: false, pending: true, message: 'Press Run to run the check.' };
      const res = await execCommand(check.command);
      const verdict = verifyLessonOutput(
        { stdout: res?.stdout || '', stderr: res?.stderr || '', exitCode: res?.exitCode ?? -1 },
        { expectedOutput: check.expect, matchType: check.match || 'contains' }
      );
      return { id, pass: verdict.pass, message: verdict.pass ? '' : verdict.reason };
    }

    default:
      return { id, pass: false, message: `Unknown check type: ${check.type}` };
  }
}

export async function evaluateStep(step, { resolveFile, output, contentOnly = false, execCommand }) {
  const checks = step?.checks || [];
  const details = [];
  let pass = true;

  for (const check of checks) {
    const blocking = BLOCKING_TYPES.has(check.type);
    if (contentOnly && blocking) {
      details.push({ id: check.id || check.type, pass: false, pending: true, blocking, message: 'Press Run to check the output.' });
      pass = false;
      continue;
    }
    const result = await evaluateCheck(check, { resolveFile, output, execCommand });
    details.push({ ...result, blocking });
    if (!result.pass) pass = false;
  }

  // Leniency: when a step declares blocking checks (runOutput, runPasses,
  // runCommand), the pass verdict comes from those alone (all must pass).
  // Content-check misses are reported but don't block progression. Steps with
  // no blocking checks (pure content steps) keep the old behaviour — their
  // content checks are all they have to gate on.
  if (!contentOnly && checks.some((c) => BLOCKING_TYPES.has(c.type))) {
    pass = checks
      .filter((c) => BLOCKING_TYPES.has(c.type))
      .every((c) => {
        const d = details.find((x) => x.id === (c.id || c.type));
        return !!d && d.pass;
      });
  }

  return { pass, details };
}
