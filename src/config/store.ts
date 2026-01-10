import Conf from "conf";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

const StoreSchema = z.object({
  profilesDir: z.string(),
  archivesDir: z.string(),
  defaultProfileId: z.string(),
  lastProfileId: z.string().optional(),
});

export type StoreData = z.infer<typeof StoreSchema>;

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
    defaultProfileId: "default",
  };

  function readAll(): StoreData {
    const raw = { ...defaults, ...(conf.store as any) };
    const parsed = StoreSchema.safeParse(raw);
    if (!parsed.success) return defaults;
    return parsed.data;
  }

  function write<K extends keyof StoreData>(key: K, value: StoreData[K]) {
    // conf 会持久化到磁盘；这里保持 key 粒度写入即可
    conf.set(key, value as any);
  }

  return {
    readAll,
    write,
  };
}


