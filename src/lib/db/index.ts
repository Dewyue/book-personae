import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import { DB_PATH, DATA_DIR, UPLOADS_DIR, ensureDbPath } from "@/lib/paths";
import * as schema from "./schema";

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  ensureDbPath();
}

function columnExists(sqlite: Database.Database, table: string, column: string) {
  const rows = sqlite
    .prepare(`PRAGMA table_info(${table})`)
    .all() as { name: string }[];
  return rows.some((r) => r.name === column);
}

function migrate(sqlite: Database.Database) {
  sqlite.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT,
      source_filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'processing',
      status_message TEXT,
      error TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      "index" INTEGER NOT NULL,
      content TEXT NOT NULL,
      embedding TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS distills (
      book_id TEXT PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
      summary TEXT NOT NULL,
      key_points TEXT NOT NULL,
      outline TEXT NOT NULL,
      quotes TEXT NOT NULL,
      questions TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      citations TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS personas (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      role_label TEXT,
      profile TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      sample_quotes TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS chunks_book_id_idx ON chunks(book_id);
    CREATE INDEX IF NOT EXISTS messages_book_id_idx ON messages(book_id);
    CREATE INDEX IF NOT EXISTS personas_book_id_idx ON personas(book_id);
  `);

  if (!columnExists(sqlite, "books", "default_persona_id")) {
    sqlite.exec(`ALTER TABLE books ADD COLUMN default_persona_id TEXT;`);
  }
  if (!columnExists(sqlite, "messages", "persona_id")) {
    sqlite.exec(`ALTER TABLE messages ADD COLUMN persona_id TEXT;`);
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);
  `);

  if (!columnExists(sqlite, "books", "user_id")) {
    // Legacy rows without owner stay unreachable until claimed; require NOT NULL for new inserts via app.
    sqlite.exec(`ALTER TABLE books ADD COLUMN user_id TEXT;`);
    sqlite.exec(
      `CREATE INDEX IF NOT EXISTS books_user_id_idx ON books(user_id);`,
    );
  }
}

const globalForDb = globalThis as unknown as {
  __bookPersonaeDb?: ReturnType<typeof drizzle<typeof schema>>;
  __bookPersonaeSqlite?: Database.Database;
};

function createDb() {
  ensureDirs();
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  migrate(sqlite);
  const db = drizzle(sqlite, { schema });
  globalForDb.__bookPersonaeSqlite = sqlite;
  globalForDb.__bookPersonaeDb = db;
  return db;
}

export const db = globalForDb.__bookPersonaeDb ?? createDb();
