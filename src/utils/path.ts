import path from "node:path";
import fs from "node:fs/promises";

/** Resolve input directory argument (or cwd). Throws if not a directory. */
export async function resolveInputDir(raw?: string) {
  const p = raw && raw.trim().length > 0 ? raw : process.cwd();
  const abs = path.resolve(process.cwd(), p);
  const st = await fs.stat(abs);
  if (!st.isDirectory()) throw new Error(`Not a directory: ${abs}`);
  return abs;
}
