import path from "node:path";

export function shortHash(s: string | undefined | null, n = 6) {
  const v = String(s ?? "");
  if (!v) return "";
  return v.length <= n ? v : v.slice(0, n);
}

export function relativePath(base: string, target: string) {
  try {
    const rel = path.relative(base, target);
    return rel && !rel.startsWith("..") ? rel : target;
  } catch {
    return target;
  }
}

export function shortenMiddle(s: string, maxLen = 80) {
  const v = String(s ?? "");
  if (v.length <= maxLen) return v;
  const head = Math.max(10, Math.floor(maxLen * 0.55));
  const tail = Math.max(10, maxLen - head - 1);
  return v.slice(0, head) + "…" + v.slice(v.length - tail);
}

export function padRight(s: string, width: number) {
  const v = String(s ?? "");
  if (v.length >= width) return v;
  return v + " ".repeat(width - v.length);
}
