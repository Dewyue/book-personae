import { NextRequest, NextResponse } from "next/server";
import { probeEmbedding } from "@/lib/embed";
import { getOpenAI, runWithLlm } from "@/lib/llm";
import {
  LLM_COOKIE,
  PRESETS,
  decodeLlmCookie,
  encodeLlmCookie,
  publicLlmStatus,
  type PresetId,
  type StoredLlmSettings,
} from "@/lib/user-llm";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const fromCookie = decodeLlmCookie(req.cookies.get(LLM_COOKIE)?.value);
  const settings = fromCookie ?? (
    process.env.OPENAI_API_KEY
      ? {
          apiKey: process.env.OPENAI_API_KEY,
          baseURL: process.env.OPENAI_BASE_URL,
          model: process.env.OPENAI_MODEL,
          embeddingModel: process.env.OPENAI_EMBEDDING_MODEL,
          preset: "custom" as const,
        }
      : null
  );
  return NextResponse.json({
    ...publicLlmStatus(settings),
    source: fromCookie ? "browser" : settings ? "server" : null,
    presets: Object.values(PRESETS).map((p) => ({
      id: p.id,
      label: p.label,
      help: p.help,
      signupUrl: p.signupUrl,
      baseURL: p.baseURL,
      model: p.model,
      embeddingModel: p.embeddingModel,
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    apiKey?: string;
    preset?: PresetId | "custom";
    baseURL?: string;
    model?: string;
    embeddingModel?: string;
    test?: boolean;
  };

  const apiKey = String(body.apiKey ?? "").trim();
  if (!apiKey || apiKey.length < 8) {
    return NextResponse.json({ error: "请粘贴有效的 API 密钥" }, { status: 400 });
  }

  const preset = body.preset && body.preset in PRESETS ? body.preset : body.preset === "custom" ? "custom" : "siliconflow";
  const presetCfg = preset !== "custom" ? PRESETS[preset] : null;

  const settings: StoredLlmSettings = {
    apiKey,
    preset,
    baseURL:
      String(body.baseURL ?? "").trim() ||
      presetCfg?.baseURL ||
      undefined,
    model:
      String(body.model ?? "").trim() ||
      presetCfg?.model ||
      undefined,
    embeddingModel:
      String(body.embeddingModel ?? "").trim() ||
      presetCfg?.embeddingModel ||
      undefined,
  };

  if (body.test !== false) {
    try {
      await runWithLlm(settings, async () => {
        const openai = getOpenAI();
        await openai.chat.completions.create({
          model: settings.model || "gpt-4o-mini",
          max_tokens: 4,
          messages: [{ role: "user", content: "hi" }],
        });
        await probeEmbedding();
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "密钥验证失败";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const res = NextResponse.json({
    ok: true,
    ...publicLlmStatus(settings),
  });
  res.cookies.set(LLM_COOKIE, encodeLlmCookie(settings), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true, connected: false });
  res.cookies.set(LLM_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
