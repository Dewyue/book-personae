import { omitCore } from "@/lib/_core-omitted";

export type RetrievedChunk = {
  index: number;
  content: string;
  score: number;
};

/** Showcase stub — retrieval ranking not published. */
export async function retrieveChunks(
  _bookId: string,
  _query: string,
  _topK = 5,
): Promise<RetrievedChunk[]> {
  omitCore("原文检索");
}

export function formatCitations(retrieved: RetrievedChunk[]) {
  return retrieved.map((c) => ({
    index: c.index,
    excerpt: c.content.slice(0, 220) + (c.content.length > 220 ? "…" : ""),
  }));
}
