#!/usr/bin/env node
/**
 * Compiles the Tailwind source for the static landing page.
 *
 *   node scripts/build-landing-css.mjs
 *
 * Reads scripts/landing.css, writes index-style.css next to index.html so the
 * GitHub Pages build needs no tooling at runtime. Re-run after any class change
 * in index.html.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "scripts/landing.css");
const target = path.join(root, "index-style.css");

const css = await fs.readFile(source, "utf8");
const result = await postcss([tailwind()]).process(css, { from: source, to: target });

await fs.writeFile(target, result.css);

const kb = (Buffer.byteLength(result.css) / 1024).toFixed(1);
console.log(`index-style.css written from scripts/landing.css (${kb} kB)`);
