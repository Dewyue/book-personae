import { asc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { getOwnedBook } from "@/lib/book-access";
import { db } from "@/lib/db";
import { messages, personas } from "@/lib/db/schema";
import { getChatModel, getOpenAI, runWithLlm } from "@/lib/llm";
import { buildLiveSystemPrompt } from "@/lib/persona";
import { formatCitations, retrieveChunks } from "@/lib/rag";
import { readLlmSettingsFromRequest } from "@/lib/user-llm";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = requireUser(req);
  if (!isUser(user)) return user;

  const llm = readLlmSettingsFromRequest(req);
  if (!llm?.apiKey) {
    return Response.json(
      { error: "请先连接你的 AI 账号（首页右上角）" },
      { status: 401 },
    );
  }

  return runWithLlm(llm, async () => {
    const { id } = await params;
    const book = getOwnedBook(id, user);
    if (!book) {
      return Response.json({ error: "书籍不存在" }, { status: 404 });
    }
    if (book.status !== "ready") {
      return Response.json(
        { error: "书籍尚未处理完成，暂时无法对话" },
        { status: 400 },
      );
    }

    const body = (await req.json()) as { message?: string; personaId?: string };
    const userMessage = String(body.message ?? "").trim();
    if (!userMessage) {
      return Response.json({ error: "请输入问题" }, { status: 400 });
    }

    const personaId = body.personaId || book.defaultPersonaId;
    if (!personaId) {
      return Response.json({ error: "未找到可用分身" }, { status: 400 });
    }

    const persona = db
      .select()
      .from(personas)
      .where(eq(personas.id, personaId))
      .get();
    if (!persona || persona.bookId !== id) {
      return Response.json({ error: "分身不存在" }, { status: 404 });
    }

    const userId = crypto.randomUUID();
    db.insert(messages)
      .values({
        id: userId,
        bookId: id,
        personaId,
        role: "user",
        content: userMessage,
        citations: [],
        createdAt: new Date(),
      })
      .run();

    const retrieved = await retrieveChunks(id, userMessage, 3);
    const citations = formatCitations(retrieved);
    const context = retrieved
      .map((c, i) => `(记忆${i + 1}) ${c.content.slice(0, 280)}`)
      .join("\n");

    const history = db
      .select()
      .from(messages)
      .where(eq(messages.bookId, id))
      .orderBy(asc(messages.createdAt))
      .all()
      .filter((m) => m.personaId === personaId)
      .slice(-12)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const openai = getOpenAI();
    const stream = await openai.chat.completions.create({
      model: getChatModel(),
      temperature: 0.65,
      presence_penalty: 0.25,
      frequency_penalty: 0.2,
      stream: true,
      messages: [
        {
          role: "system",
          content: buildLiveSystemPrompt(book.title, persona, context),
        },
        ...history,
      ],
    });

    const encoder = new TextEncoder();
    let full = "";

    const readable = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        };

        send("citations", { citations });

        try {
          for await (const part of stream) {
            const delta = part.choices[0]?.delta?.content ?? "";
            if (delta) {
              full += delta;
              send("token", { text: delta });
            }
          }

          const assistantId = crypto.randomUUID();
          db.insert(messages)
            .values({
              id: assistantId,
              bookId: id,
              personaId,
              role: "assistant",
              content: full || "（无回复）",
              citations,
              createdAt: new Date(),
            })
            .run();

          send("done", { messageId: assistantId, content: full });
        } catch (err) {
          const message = err instanceof Error ? err.message : "对话失败";
          send("error", { error: message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  });
}
