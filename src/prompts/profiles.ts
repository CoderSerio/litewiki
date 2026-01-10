import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { defaultProfile, type PromptProfile } from "./defaultProfile.js";

const ProfileSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  systemPrompt: z.string().min(1),
  extensions: z.array(z.string()).optional(),
  outputFormat: z.literal("markdown"),
});

export type LoadedProfile = PromptProfile & { source: "builtin" | "file"; filePath?: string };

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export function profileFilePath(profilesDir: string, id: string) {
  return path.join(profilesDir, `${id}.json`);
}

export async function loadProfileFromFile(filePath: string): Promise<LoadedProfile> {
  const raw = await fs.readFile(filePath, "utf-8");
  const json = JSON.parse(raw);
  const parsed = ProfileSchema.parse(json);
  return { ...parsed, source: "file", filePath };
}

export async function listProfiles(profilesDir: string): Promise<LoadedProfile[]> {
  const items = await fs.readdir(profilesDir, { withFileTypes: true }).catch(() => []);
  const results: LoadedProfile[] = [{ ...defaultProfile, source: "builtin" }];

  for (const it of items) {
    if (!it.isFile()) continue;
    if (!it.name.endsWith(".json")) continue;
    const fp = path.join(profilesDir, it.name);
    try {
      const prof = await loadProfileFromFile(fp);
      // 文件同名覆盖 builtin（例如 default.json）
      const idx = results.findIndex((p) => p.id === prof.id);
      if (idx >= 0) results[idx] = prof;
      else results.push(prof);
    } catch {
      // 坏文件直接忽略：CLI 可用性优先；需要时再做 profiles doctor
      continue;
    }
  }

  return results;
}

export async function getProfileById(profilesDir: string, id: string): Promise<LoadedProfile | null> {
  if (id === defaultProfile.id) return { ...defaultProfile, source: "builtin" };
  const fp = profileFilePath(profilesDir, id);
  try {
    return await loadProfileFromFile(fp);
  } catch {
    return null;
  }
}

export async function writeProfileFile(filePath: string, profile: PromptProfile) {
  await ensureDir(path.dirname(filePath));
  const data = ProfileSchema.parse(profile);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}


