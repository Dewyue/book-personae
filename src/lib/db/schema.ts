import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export type PersonaProfile = {
  summary: string;
  worldview: string[];
  speakingStyle: string;
  /** e.g. 智识冷静、动员鼓动、市井俏皮 — distilled per person */
  voiceRegister: string;
  /** Phrases/styles this person would never use */
  avoidSounds: string[];
  values: string[];
  topics: string[];
  catchphrases: string[];
  boundaries: string;
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const books = sqliteTable("books", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  author: text("author"),
  sourceFilename: text("source_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  status: text("status", {
    enum: ["processing", "ready", "failed"],
  })
    .notNull()
    .default("processing"),
  statusMessage: text("status_message"),
  error: text("error"),
  defaultPersonaId: text("default_persona_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const personas = sqliteTable("personas", {
  id: text("id").primaryKey(),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["author", "character"] }).notNull(),
  name: text("name").notNull(),
  roleLabel: text("role_label"),
  profile: text("profile", { mode: "json" }).$type<PersonaProfile>().notNull(),
  systemPrompt: text("system_prompt").notNull(),
  sampleQuotes: text("sample_quotes", { mode: "json" }).$type<string[]>().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const chunks = sqliteTable("chunks", {
  id: text("id").primaryKey(),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  index: integer("index").notNull(),
  content: text("content").notNull(),
  embedding: text("embedding").notNull(),
});

export const distills = sqliteTable("distills", {
  bookId: text("book_id")
    .primaryKey()
    .references(() => books.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  keyPoints: text("key_points", { mode: "json" }).$type<string[]>().notNull(),
  outline: text("outline", { mode: "json" }).$type<string[]>().notNull(),
  quotes: text("quotes", { mode: "json" }).$type<string[]>().notNull(),
  questions: text("questions", { mode: "json" }).$type<string[]>().notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  personaId: text("persona_id").references(() => personas.id, {
    onDelete: "set null",
  }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  citations: text("citations", { mode: "json" })
    .$type<{ index: number; excerpt: string }[]>()
    .notNull()
    .default([]),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Book = typeof books.$inferSelect;
export type Persona = typeof personas.$inferSelect;
export type Distill = typeof distills.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Chunk = typeof chunks.$inferSelect;
