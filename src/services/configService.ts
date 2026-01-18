import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ensureDir } from "../utils/fs.js";
import { createConfigStore } from "../config/store.js";

export const ConfigSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  key: z.string().min(1),
  baseUrl: z.string().min(1),
});

export type ConfigItem = z.infer<typeof ConfigSchema> & {
  filePath: string;
};

export function configFilePath(configDir: string, id: string) {
  return path.join(configDir, `${id}.json`);
}

export async function listConfigs(configDir: string): Promise<ConfigItem[]> {
  const ents = await fs.readdir(configDir, { withFileTypes: true }).catch(() => []);
  const results: ConfigItem[] = [];
  for (const it of ents) {
    if (!it.isFile() || !it.name.endsWith(".json")) continue;
    // legacy single-config file name; handled by migrateLegacyConfigIfNeeded
    if (it.name === "config.json") continue;
    const fp = path.join(configDir, it.name);
    try {
      const raw = JSON.parse(await fs.readFile(fp, "utf-8"));
      const id = String(raw?.id ?? path.basename(it.name, ".json"));
      const parsed = ConfigSchema.parse({ ...raw, id });
      results.push({ ...parsed, filePath: fp });
    } catch {
      continue;
    }
  }
  // stable order by id
  results.sort((a, b) => (a.id < b.id ? -1 : 1));
  return results;
}

export async function loadConfigById(configDir: string, id: string): Promise<ConfigItem | null> {
  const fp = configFilePath(configDir, id);
  try {
    const raw = JSON.parse(await fs.readFile(fp, "utf-8"));
    const parsed = ConfigSchema.parse({ ...raw, id });
    return { ...parsed, filePath: fp };
  } catch {
    return null;
  }
}

export async function saveConfig(configDir: string, cfg: Omit<ConfigItem, "filePath">) {
  await ensureDir(configDir);
  const data = ConfigSchema.parse(cfg);
  const fp = configFilePath(configDir, data.id);
  await fs.writeFile(fp, JSON.stringify(data, null, 2) + "\n", "utf-8");
  return { ...data, filePath: fp } as ConfigItem;
}

export async function deleteConfig(configDir: string, id: string) {
  const fp = configFilePath(configDir, id);
  await fs.unlink(fp).catch(() => {});
}

export function getActiveConfigId(): string | undefined {
  const store = createConfigStore();
  const conf = store.readAll();
  return (conf as any).activeConfigId as string | undefined;
}

export function setActiveConfigId(id?: string) {
  const store = createConfigStore();
  if (id) (store as any).write("activeConfigId" as any, id as any);
  else (store as any).write("activeConfigId" as any, undefined as any);
}

// Migration: import old single config.json to a default config item if exists
export async function migrateLegacyConfigIfNeeded(configDir: string) {
  await ensureDir(configDir);
  const legacy = path.join(configDir, "config.json");
  const exists = await fs.stat(legacy).then(() => true).catch(() => false);
  const hasAny = (await listConfigs(configDir)).length > 0;
  if (!exists || hasAny) return;
  try {
    const raw = JSON.parse(await fs.readFile(legacy, "utf-8"));
    const id = "default";
    const cfg = ConfigSchema.parse({
      id,
      provider: String(raw?.provider || "openai"),
      model: String(raw?.model || ""),
      key: String(raw?.key || ""),
      baseUrl: String(raw?.baseUrl || ""),
    });
    await saveConfig(configDir, cfg);
    setActiveConfigId(id);
  } catch {
    // ignore
  }
}

