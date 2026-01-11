import Conf from "conf";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

const StoreSchema = z.object({
  profilesDir: z.string(),
  archivesDir: z.string(),
  configDir: z.string(),
  defaultProfileId: z.string(),
  lastProfileId: z.string().optional(),
});

export type StoreData = z.infer<typeof StoreSchema>;

// XDG means X Series Desktop Group (LinuX, UniX)
function xdgConfigHome() {
  const env = process.env.XDG_CONFIG_HOME;
  if (env && env.trim()) return env;
  return path.join(os.homedir(), ".config");
}

export function createConfigStore() {
  const conf = new Conf<StoreData>({
    projectName: "litewiki",
  });

  const defaults: StoreData = {
    profilesDir: path.join(xdgConfigHome(), "litewiki", "profiles"),
    archivesDir: path.join(xdgConfigHome(), "litewiki", "runs"),
    configDir: path.join(xdgConfigHome(), "litewiki", "configs"),
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
