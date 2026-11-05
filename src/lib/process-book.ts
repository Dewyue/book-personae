import { omitCore } from "@/lib/_core-omitted";

/** Showcase stub — real pipeline lives in private/core (not published). */
export async function processBook(
  _bookId: string,
  _opts: { skipEmbedIfPresent?: boolean } = {},
): Promise<void> {
  omitCore("书籍处理");
}
