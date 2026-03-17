// Rush-FS: High-performance fs powered by Rust
// API-aligned with Node.js fs for drop-in replacement
import * as rushFs from "@rush-fs/core";
import * as fs from "node:fs/promises";

// Type aliases from Node.js fs (Rush-FS is API-aligned)
import type { Dirent, Stats } from "node:fs";

export async function ensureDir(dir: string) {
  await rushFs.mkdir(dir, { recursive: true });
}

// Type-safe wrappers using Node.js fs types
export async function readFile(
  path: string,
  options?: { encoding?: string | null; flag?: string } | string | null,
): Promise<string | Buffer> {
  return rushFs.readFile(path, options as any);
}

export async function writeFile(
  path: string,
  data: string | NodeJS.ArrayBufferView,
  options?:
    | { encoding?: string | null; mode?: number | string; flag?: string }
    | string
    | null,
): Promise<void> {
  return rushFs.writeFile(path, data, options as any);
}

export async function readdir(
  path: string,
  options?: { recursive?: boolean; withFileTypes?: boolean } | string | null,
): Promise<string[] | Dirent[]> {
  return rushFs.readdir(path, options as any);
}

export async function unlink(path: string): Promise<void> {
  return rushFs.unlink(path);
}

export async function stat(path: string): Promise<Stats> {
  return rushFs.stat(path);
}

export async function rm(
  path: string,
  options?: { recursive?: boolean; force?: boolean },
): Promise<void> {
  return rushFs.rm(path, options);
}

export async function copyFile(src: string, dest: string): Promise<void> {
  return rushFs.copyFile(src, dest);
}

export async function access(path: string, mode?: number): Promise<void> {
  return rushFs.access(path, mode);
}

// Re-export Node.js fs types for convenience
export type { Dirent, Stats };
