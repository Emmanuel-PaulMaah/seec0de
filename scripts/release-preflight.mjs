#!/usr/bin/env node
/**
 * Release preflight.
 *
 * electron-builder wipes its previous `win-unpacked` folder before packaging
 * (app-builder: electron.UnpackElectron -> EnsureEmptyDir). If any file in there
 * is still open by another process (Windows sharing violation), the whole build
 * dies late and cryptically with:
 *
 *   remove ...\resources\app.asar: The process cannot access the file because it is being used by another process.
 *   app-builder.exe process failed ERR_ELECTRON_BUILDER_CANNOT_EXECUTE
 *
 * This script reproduces that check in ~1 second (a rename probe: renaming a file
 * on Windows needs the same delete access that removing it does) so the build
 * either starts from a clean slate or tells you exactly what to do.
 *
 * Exit codes: 0 = output folder is writable/removable, 1 = something is locked.
 *
 * Usage:
 *   node scripts/release-preflight.mjs [--dir <output-dir>]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const flagIndex = (name) => args.indexOf(name);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dirArg = flagIndex("--dir") !== -1 ? args[flagIndex("--dir") + 1] : "release";
const outDir = path.resolve(projectRoot, dirArg || "release");
const unpackedDir = path.join(outDir, "win-unpacked");
const MAX_REPORTED = 5;

const rel = (p) => path.relative(projectRoot, p) || ".";

function collectFiles(dir, out = [], depth = 0) {
  if (depth > 4) return out;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, out, depth + 1);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

/** @returns {string|null} the error code if the file cannot be renamed (i.e. delete-blocked), else null */
function deleteLocked(file) {
  const probe = `${file}.__locktest__`;
  try {
    fs.renameSync(file, probe);
  } catch (err) {
    return err.code || String(err);
  }
  try {
    fs.renameSync(probe, file);
  } catch (err) {
    return `probe could not be renamed back (${err.code || err}): ${probe}`;
  }
  return null;
}

if (!fs.existsSync(unpackedDir)) {
  console.log(`✓ release preflight: nothing to wipe — ${rel(unpackedDir)} does not exist.`);
  process.exit(0);
}

const files = collectFiles(unpackedDir);
const locked = files
  .map((file) => ({ file, code: deleteLocked(file) }))
  .filter((entry) => entry.code);

if (locked.length === 0) {
  console.log(
    `✓ release preflight: ${rel(unpackedDir)} is clean — ${files.length} file(s) removable, ${rel(outDir)} is safe to rebuild into.`
  );
  process.exit(0);
}

console.error(`✗ release preflight: ${locked.length} file(s) in ${rel(unpackedDir)} are held open by another process.`);
for (const { file, code } of locked.slice(0, MAX_REPORTED)) {
  console.error(`    ${rel(file)}  (${code})`);
}
if (locked.length > MAX_REPORTED) {
  console.error(`    ...and ${locked.length - MAX_REPORTED} more`);
}

console.error(`
  Why this matters: electron-builder deletes ${rel(unpackedDir)} before packaging,
  so \`npm run dist:win\` / \`npm run release:win\` will die with:
    ERR_ELECTRON_BUILDER_CANNOT_EXECUTE
    "The process cannot access the file because it is being used by another process."

  FIX (pick one)
    1. Close whatever holds it, then re-run.
       - Sysinternals handle:      handle64.exe -accepteula "${unpackedDir}"
       - No admin?                 resmon -> CPU tab -> Associated Handles -> search "app.asar"
       - Typical holders: VS Code (file watcher/indexer), Windows Defender real-time scan
         (the 170 MB asar is the biggest file in the project), a running dev instance,
         or a stale handle left over from a crashed build.
       - Easiest: reboot, then re-run.
    2. Skip this folder entirely — no reboot, no hunting for the holder:
         npm run release:win:workaround
       (builds into ${rel(path.join(projectRoot, "release-workaround"))} instead)

  Then run \`npm run preflight\` again — it must print ✓ before you bother building.`);
process.exit(1);
