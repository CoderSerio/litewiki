import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Conf, { type Options as ConfOptions } from "conf";
import { z } from "zod";

const StoreSchema = z.object({
  profilesDir: z.string(),
  archivesDir: z.string(),
  configDir: z.string(),
  defaultProfileId: z.string(),
  lastProfileId: z.string().optional(),
  activeConfigId: z.string().optional(),
  locale: z.string().optional(),
});

export type StoreData = z.infer<typeof StoreSchema>;

// XDG means X Series Desktop Group (LinuX, UniX)
function xdgConfigHome() {
  const env = process.env.XDG_CONFIG_HOME;
  if (env && env.trim()) return env;
  return path.join(os.homedir(), ".config");
}

export function createConfigStore() {
  const homeOverride = process.env.LITEWIKI_HOME?.trim();
  const baseDir = homeOverride
    ? path.resolve(homeOverride)
    : path.join(xdgConfigHome(), "litewiki");

  const confOptions: ConfOptions<StoreData> = {
    projectName: "litewiki",
  };
  if (homeOverride) {
    const storeDir = path.join(baseDir, "store");
    fs.mkdirSync(storeDir, { recursive: true });
    confOptions.cwd = storeDir;
  }
  const conf = new Conf<StoreData>(confOptions as any);

  const defaults: StoreData = {
    profilesDir: path.join(baseDir, "profiles"),
    archivesDir: path.join(baseDir, "runs"),
    configDir: path.join(baseDir, "configs"),
    defaultProfileId: "default",
  };

  function readAll(): StoreData {
    const raw = { ...defaults, ...(conf.store as any) };
    const parsed = StoreSchema.safeParse(raw);
    if (!parsed.success) return defaults;
    return parsed.data;
  }

  function write<K extends keyof StoreData>(key: K, value: StoreData[K]) {
    // conf will be persisted to disk, so convenient! :D
    conf.set(key, value as any);
  }

  return {
    readAll,
    write,
  };
}
