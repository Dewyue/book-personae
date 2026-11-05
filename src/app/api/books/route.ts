import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { after } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { runWithLlm } from "@/lib/llm";
import { titleFromFilename } from "@/lib/parse";
import { UPLOADS_DIR } from "@/lib/paths";
import { processBook } from "@/lib/process-book";
import { readLlmSettingsFromRequest } from "@/lib/user-llm";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED_EXT = new Set([".pdf", ".epub", ".txt", ".md"]);

function mimeFor(filename: string, fallback: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".epub")) return "application/epub+zip";
  if (lower.endsWith(".md")) return "text/markdown";
  if (lower.endsWith(".txt")) return "text/plain";
  return fallback || "application/octet-stream";
}

export async function GET(req: NextRequest) {
  const user = requireUser(req);
  if (!isUser(user)) return user;

  const list = db
    .select()
    .from(books)
    .where(eq(books.userId, user.id))
    .orderBy(desc(books.createdAt))
    .all();
  return NextResponse.json({ books: list });
}

export async function POST(req: NextRequest) {
  const user = requireUser(req);
  if (!isUser(user)) return user;

  const llm = readLlmSettingsFromRequest(req);
  if (!llm?.apiKey) {
    return NextResponse.json(
      { error: "请先连接你的 AI 账号（首页右上角）" },
      { status: 401 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请上传文件" }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      { error: "仅支持 PDF / EPUB / TXT / MD" },
      { status: 400 },
    );
  }

  const maxBytes =
    process.env.VERCEL === "1" ? 4 * 1024 * 1024 : 40 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json(
      {
        error:
          process.env.VERCEL === "1"
            ? "线上单次上传约 4MB 上限，请用更小文件或本地运行"
            : "文件不能超过 40MB",
      },
      { status: 400 },
    );
  }

  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  const id = crypto.randomUUID();
  const filename = file.name;
  const dest = path.join(UPLOADS_DIR, `${id}${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(dest, buffer);

  const title =
    String(form.get("title") || "").trim() || titleFromFilename(filename);

  db.insert(books)
    .values({
      id,
      userId: user.id,
      title,
      author: null,
      sourceFilename: filename,
      mimeType: mimeFor(filename, file.type),
      status: "processing",
      statusMessage: "排队处理中…",
      error: null,
      createdAt: new Date(),
    })
    .run();

  after(async () => {
    await runWithLlm(llm, () => processBook(id));
  });

  const book = db.select().from(books).where(eq(books.id, id)).get();
  return NextResponse.json({ book }, { status: 201 });
}
