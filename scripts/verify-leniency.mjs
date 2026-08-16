// Temporary verification: (1) every sample step's own solution still passes
// evaluateStep, (2) a functionally-correct solution that misses a content
// pattern is no longer blocked when its output is right.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import 'sucrase/register';
import { evaluateStep } from '../src/renderer/engine/buildVerifier.js';
import buildProjects from '../src/renderer/data/buildProjects.js';

const tmp = mkdtempSync(join(tmpdir(), 'seec0de-verify-'));
let failures = 0;

function runFile(name, content) {
  const file = join(tmp, name);
  writeFileSync(file, content);
  try {
    const cmd = name.endsWith('.py') ? 'python' : 'node';
    const stdout = execFileSync(cmd, [file], { encoding: 'utf8' });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (err) {
    return { stdout: String(err.stdout || ''), stderr: String(err.stderr || err.message || ''), exitCode: err.status ?? -1 };
  }
}

for (const p of buildProjects) {
  for (const s of p.steps) {
    const output = runFile(s.file, s.solution);
    const { pass, details } = await evaluateStep(s, { resolveFile: async () => s.solution, output });
    const fails = details.filter((d) => !d.pass);
    if (!pass || fails.length) {
      failures += 1;
      console.error(`[FAIL] ${p.id} :: ${s.id} — pass=${pass}`, fails.map((d) => `${d.id}: ${d.message}`).join(' | '));
      if (output.stderr) console.error('  stderr:', output.stderr.slice(0, 300));
    } else {
      console.log(`[ok] ${p.id} :: ${s.id}`);
    }
  }
}

// Leniency check: fizzbuzz step 1 solved WITHOUT the expected '% 3' pattern.
const alternative = `const limit = 15;
for (let n = 1; n <= limit; n += 1) {
  const fizz = Number.isInteger(n / 3);
  const buzz = Number.isInteger(n / 5);
  const word = fizz && buzz ? "FizzBuzz" : fizz ? "Fizz" : buzz ? "Buzz" : String(n);
  console.log(word);
}
`;
const step1 = buildProjects.find((p) => p.id === 'fizzbuzz').steps[0];
const altOutput = runFile(step1.file, alternative);
const alt = await evaluateStep(step1, { resolveFile: async () => alternative, output: altOutput });
if (alt.pass) {
  console.log('[ok] leniency: alternative FizzBuzz (no "% 3") passes');
} else {
  failures += 1;
  console.error('[FAIL] leniency: alternative FizzBuzz was blocked', alt.details.filter((d) => !d.pass).map((d) => d.message));
}

rmSync(tmp, { recursive: true, force: true });
if (failures) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log('\nAll checks passed.');
