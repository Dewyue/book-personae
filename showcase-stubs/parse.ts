import { omitCore } from "@/lib/_core-omitted";

/** Showcase stub — PDF/EPUB extractors not published. */
export async function extractTextFromFile(
  _filePath: string,
  _mimeType: string,
  _filename: string,
): Promise<string> {
  omitCore("书籍解析");
}

/** Harmless helper kept public for upload UI. */
export function titleFromFilename(filename: string) {
  return (
    filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() ||
    "未命名书籍"
  );
}
