#!/usr/bin/env node
/**
 * Copies proprietary core modules from private/core → src/lib when present.
 * Public clones without private/ keep the showcase stubs and cannot run the pipeline.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "private", "core");
const dest = path.join(root, "src", "lib");

const CORE_FILES = [
  "process-book.ts",
  "distill.ts",
  "persona.ts",
  "rag.ts",
  "embed.ts",
  "chunk.ts",
  "parse.ts",
  "llm.ts",
];

if (!fs.existsSync(src)) {
  console.warn(
    "[apply-private-core] private/core missing — using public stubs (showcase mode).",
  );
  process.exit(0);
}

for (const file of CORE_FILES) {
  const from = path.join(src, file);
  const to = path.join(dest, file);
  if (!fs.existsSync(from)) {
    console.warn(`[apply-private-core] skip missing ${file}`);
    continue;
  }
  fs.copyFileSync(from, to);
  console.log(`[apply-private-core] restored ${file}`);
}
