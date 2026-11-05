import path from "path";
import fs from "fs";
import os from "os";

/** On Vercel the app filesystem is read-only; use /tmp (ephemeral). */
function resolveDataDir() {
  if (process.env.VERCEL === "1" || process.env.BOOK_PERSONAE_DATA_DIR) {
    return (
      process.env.BOOK_PERSONAE_DATA_DIR ||
      path.join(os.tmpdir(), "book-personae-data")
    );
  }
  return path.join(process.cwd(), "data");
}

export const DATA_DIR = resolveDataDir();
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const DB_PATH = path.join(DATA_DIR, "book-personae.db");

/** Migrate legacy filename from early "co-read" naming. */
export function ensureDbPath() {
  const legacy = path.join(DATA_DIR, "co-read.db");
  if (!fs.existsSync(DB_PATH) && fs.existsSync(legacy)) {
    fs.renameSync(legacy, DB_PATH);
    for (const suffix of ["-shm", "-wal"]) {
      const from = `${legacy}${suffix}`;
      const to = `${DB_PATH}${suffix}`;
      if (fs.existsSync(from) && !fs.existsSync(to)) {
        fs.renameSync(from, to);
      }
    }
  }
}
