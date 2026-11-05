/** Safely parse API JSON; map HTML / plain-text platform errors to readable messages. */
export async function readApiJson<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(res.ok ? "空响应" : `请求失败（${res.status}）`);
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    if (
      res.status === 413 ||
      /^Request Entity/i.test(trimmed) ||
      /FUNCTION_PAYLOAD_TOO_LARGE/i.test(trimmed) ||
      /Payload Too Large/i.test(trimmed)
    ) {
      throw new Error(
        "文件太大：线上环境单次上传约 4MB 上限。请用更小的 TXT/MD，或本地 npm run dev 上传大书。",
      );
    }
    if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
      throw new Error(
        `服务端返回了网页而不是数据（${res.status}）。可能是线上托管限制或处理超时，请稍后重试或本地运行。`,
      );
    }
    throw new Error(trimmed.slice(0, 200) || `请求失败（${res.status}）`);
  }
}

/** Vercel Functions hard-cap request bodies ~4.5MB. */
export function maxUploadBytes(): number {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.includes("vercel.app") || host.includes("vercel.com")) {
      return 4 * 1024 * 1024;
    }
  }
  if (process.env.VERCEL === "1") return 4 * 1024 * 1024;
  return 40 * 1024 * 1024;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${(n / (1024 * 1024)).toFixed(1)}MB`;
}
