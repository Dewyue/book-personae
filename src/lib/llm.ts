import { AsyncLocalStorage } from "async_hooks";
import OpenAI from "openai";
import type { ChatCompletion } from "openai/resources/chat/completions";
import { omitCore } from "@/lib/_core-omitted";

export type LlmCredentials = {
  apiKey: string;
  baseURL?: string;
  model?: string;
  embeddingModel?: string;
};

const llmStore = new AsyncLocalStorage<LlmCredentials>();

export function runWithLlm<T>(creds: LlmCredentials, fn: () => Promise<T>) {
  return llmStore.run(creds, fn);
}

export function getLlmCredentials(): LlmCredentials | null {
  return llmStore.getStore() ?? null;
}

/** Showcase stub — provider wiring / retry policy not published. */
export function getOpenAI(): OpenAI {
  omitCore("模型客户端");
}

export function getChatModel(): string {
  omitCore("对话模型");
}

export function getEmbeddingModel(): string {
  omitCore("向量模型");
}

export function formatLlmError(err: unknown) {
  return err instanceof Error ? err.message : "调用模型失败";
}

export async function withRetry<T>(
  _fn: () => Promise<T>,
  _opts: { retries?: number; baseDelayMs?: number; label?: string } = {},
): Promise<T> {
  omitCore("重试策略");
}

type NonStreamChatParams =
  OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

export async function createChatCompletion(
  _params: NonStreamChatParams,
): Promise<ChatCompletion> {
  omitCore("对话补全");
}
