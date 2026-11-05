import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { LlmCredentials } from "@/lib/llm";

export const LLM_COOKIE = "bp_llm";

export const PRESETS = {
  siliconflow: {
    id: "siliconflow",
    label: "硅基流动（推荐）",
    baseURL: "https://api.siliconflow.cn/v1",
    model: "Qwen/Qwen2.5-7B-Instruct",
    embeddingModel: "BAAI/bge-m3",
    signupUrl: "https://cloud.siliconflow.cn/account/ak",
    help: "国内好用，按量计费。复制 API 密钥粘贴即可。",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    embeddingModel: "text-embedding-3-small",
    signupUrl: "https://platform.openai.com/api-keys",
    help: "需要可访问 OpenAI 的网络。",
  },
} as const;

export type PresetId = keyof typeof PRESETS;

export type StoredLlmSettings = LlmCredentials & {
  preset?: PresetId | "custom";
};

export function encodeLlmCookie(settings: StoredLlmSettings) {
  return Buffer.from(JSON.stringify(settings), "utf8").toString("base64url");
}

export function decodeLlmCookie(raw: string | undefined): StoredLlmSettings | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as StoredLlmSettings;
    if (!parsed?.apiKey || typeof parsed.apiKey !== "string") return null;
    return {
      apiKey: parsed.apiKey.trim(),
      baseURL: parsed.baseURL?.trim() || undefined,
      model: parsed.model?.trim() || undefined,
      embeddingModel: parsed.embeddingModel?.trim() || undefined,
      preset: parsed.preset,
    };
  } catch {
    return null;
  }
}

export function maskKey(apiKey: string) {
  if (apiKey.length <= 8) return "****";
  return `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}`;
}

export async function readLlmSettingsFromCookies(): Promise<StoredLlmSettings | null> {
  const jar = await cookies();
  return decodeLlmCookie(jar.get(LLM_COOKIE)?.value);
}

export function readLlmSettingsFromRequest(
  req: NextRequest,
): StoredLlmSettings | null {
  return (
    decodeLlmCookie(req.cookies.get(LLM_COOKIE)?.value) ??
    envFallbackSettings()
  );
}

function envFallbackSettings(): StoredLlmSettings | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    model: process.env.OPENAI_MODEL || undefined,
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || undefined,
    preset: "custom",
  };
}

export function publicLlmStatus(settings: StoredLlmSettings | null) {
  if (!settings?.apiKey) {
    return { connected: false as const };
  }
  return {
    connected: true as const,
    preset: settings.preset ?? "custom",
    maskedKey: maskKey(settings.apiKey),
    baseURL: settings.baseURL || null,
    model: settings.model || null,
  };
}
