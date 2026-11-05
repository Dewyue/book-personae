import { omitCore } from "@/lib/_core-omitted";

/** Showcase stub — embedding batching/limits not published. */
export async function embedTexts(_texts: string[]): Promise<number[][]> {
  omitCore("向量化");
}

export async function probeEmbedding(): Promise<void> {
  omitCore("向量探测");
}

export function cosineSimilarity(_a: number[], _b: number[]): number {
  omitCore("相似度计算");
}
