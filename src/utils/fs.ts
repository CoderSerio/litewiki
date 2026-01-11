import fs from "node:fs/promises";

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}
