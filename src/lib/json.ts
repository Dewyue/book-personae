export function parseJsonLoose<T = unknown>(raw: string): T {
  const trimmed = raw.trim();
  const candidates: string[] = [trimmed];

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    candidates.push(trimmed.slice(first, last + 1));
  }

  let lastError: unknown;
  for (const candidate of candidates) {
    for (const variant of [candidate, repairJson(candidate), softFixKeys(candidate)]) {
      try {
        return JSON.parse(variant) as T;
      } catch (err) {
        lastError = err;
      }
    }
  }

  throw new Error(
    `模型返回的 JSON 无法解析：${lastError instanceof Error ? lastError.message : "unknown"}`,
  );
}

/** Quote unquoted keys and convert single quotes to double quotes cautiously. */
function softFixKeys(input: string) {
  return input
    .replace(/([,{]\s*)'([^'\\]+)'(\s*:)/g, '$1"$2"$3')
    .replace(/([,{]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3')
    .replace(/:\s*'([^'\\]*)'/g, ': "$1"')
    .replace(/,\s*([}\]])/g, "$1");
}

function repairJson(input: string) {
  let s = input.replace(/^\uFEFF/, "").replace(/,\s*([}\]])/g, "$1");

  // If model truncated mid-array/object, cut back to last complete value
  const lastBrace = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (lastBrace > 0 && lastBrace < s.length - 1) {
    // keep going — try full string first below
  }

  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
        out += ch;
        continue;
      }
      if (ch === "\n") {
        out += "\\n";
        continue;
      }
      if (ch === "\r") {
        out += "\\r";
        continue;
      }
      if (ch === "\t") {
        out += "\\t";
        continue;
      }
      out += ch;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    out += ch;
  }

  if (inString) out += '"';
  // Close unclosed brackets/braces
  const stack: string[] = [];
  inString = false;
  escaped = false;
  for (const ch of out) {
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{" || ch === "[") stack.push(ch);
    if (ch === "}" || ch === "]") stack.pop();
  }
  while (stack.length) {
    const open = stack.pop();
    out += open === "{" ? "}" : "]";
  }
  return out.replace(/,\s*([}\]])/g, "$1");
}

export async function completeJsonObject<T>(
  run: () => Promise<string>,
  opts: { retries?: number } = {},
): Promise<T> {
  const retries = opts.retries ?? 3;
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const raw = await run();
      return parseJsonLoose<T>(raw);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("无法解析模型 JSON 输出");
}
