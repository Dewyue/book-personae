#!/usr/bin/env node
/**
 * Restores public showcase stubs into src/lib (for commits / GitHub).
 * Run before git commit so proprietary private/core copies are not published.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "showcase-stubs");
const dest = path.join(root, "src", "lib");

if (!fs.existsSync(src)) {
  console.error("[restore-public-stubs] showcase-stubs/ missing");
  process.exit(1);
}

for (const file of fs.readdirSync(src)) {
  if (!file.endsWith(".ts")) continue;
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
  console.log(`[restore-public-stubs] ${file}`);
}
