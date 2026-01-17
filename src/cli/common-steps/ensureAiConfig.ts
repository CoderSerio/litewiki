import { selectWithBack, BACK_VALUE, ui } from "../core/ui.js";
import { createConfigStore } from "../../config/store.js";
import { ensureDir } from "../../utils/fs.js";
import {
  getActiveConfigId,
  listConfigs,
  migrateLegacyConfigIfNeeded,
  type ConfigItem,
} from "../../services/configService.js";
import { configController } from "../controllers/configController.js";

export type AiConfigLike = {
  provider: string;
  model: string;
  key: string;
  baseUrl?: string;
};

export async function ensureAiConfig(): Promise<AiConfigLike | null> {
  const store = createConfigStore();
  const conf = store.readAll();
  await ensureDir(conf.configDir);
  await migrateLegacyConfigIfNeeded(conf.configDir);

  const pickActive = async (): Promise<ConfigItem | null> => {
    const active = getActiveConfigId();
    if (!active) return null;
    const all = await listConfigs(conf.configDir);
    const found = all.find((c) => c.id === active);
    if (!found) return null;
    if (!found.provider || !found.model || !found.key) return null;
    return found;
  };

  const ready = await pickActive();
  if (ready) return ready;

  const choice = await selectWithBack<"manage" | "temp">({
    message: "No valid config. How to continue?",
    options: [
      { value: "manage", label: "Open config manager (pick/create and activate)" },
      { value: "temp", label: "Input once (do not save)" },
    ],
  });
  if (!choice || choice === BACK_VALUE) return null;

  if (choice === "manage") {
    await configController({ intro: true });
    const again = await pickActive();
    if (again) return again;
    // still not ready
    ui.log.warn("No valid active config found");
    return null;
  }

  // temp
  const provider = (await ui.text("provider", process.env.SILICONFLOW_API_KEY ? "siliconflow" : "")) || "siliconflow";
  const model = await ui.text("model", process.env.SILICONFLOW_MODEL || "");
  if (!model) return null;
  const key = await ui.text("key", process.env.SILICONFLOW_API_KEY || "");
  if (!key) return null;
  const baseUrl = await ui.text("baseUrl (optional)", process.env.SILICONFLOW_BASE_URL || "");
  return { provider, model, key, baseUrl: baseUrl || undefined };
}
