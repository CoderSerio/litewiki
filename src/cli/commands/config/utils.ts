import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import * as ui from "../../ui.js";

const ConfigSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  // temperature: z.number().min(0).max(1),
  // top_p: z.number().min(0).max(1),
  // top_k: z.number().min(0).max(100),
  // max_tokens: z.number().int().positive(),
  // frequency_penalty: z.number().min(0).max(2),
  // presence_penalty: z.number().min(0).max(2),
});

async function configFilePath(configDir: string) {
  return path.join(configDir, "config.json");
}

async function ensureConfigFile(configDir: string) {
  const configFile = await configFilePath(configDir);
  const exists = await fs.stat(configFile).catch(() => false);
  if (exists) return;

  const defaultConfig = {
    provider: "",
    model: "",
    key: "",
  };
  await fs.mkdir(path.dirname(configFile), { recursive: true });
  await fs.writeFile(
    configFile,
    JSON.stringify(defaultConfig, null, 2) + "\n",
    "utf-8"
  );
}

type Config = { provider: string; model: string; key: string };

async function getConfig(configDir: string): Promise<Config> {
  const configFile = await configFilePath(configDir);
  const content = await fs.readFile(configFile, "utf-8");
  return JSON.parse(content) as Config;
}

async function saveConfig(configDir: string, config: Config) {
  const configFile = await configFilePath(configDir);
  await fs.writeFile(
    configFile,
    JSON.stringify(config, null, 2) + "\n",
    "utf-8"
  );
}

export async function editConfig(configDir: string) {
  await ensureConfigFile(configDir);
  const config = await getConfig(configDir);

  // 直接显示配置项列表，选中即可编辑
  const selected = await ui.select<keyof Config | "done">({
    message: "选择配置项编辑（或完成）",
    options: [
      { value: "provider", label: `provider: ${config.provider || "(空)"}` },
      { value: "model", label: `model: ${config.model || "(空)"}` },
      { value: "key", label: `key: ${config.key || "(空)"}` },
      { value: "done", label: "✓ 完成" },
    ],
  });

  if (!selected || selected === "done") return;

  const newValue = await ui.text(`输入新的 ${selected}`, config[selected]);
  if (newValue === null) return;

  config[selected] = newValue;
  await saveConfig(configDir, config);
  ui.log.success(`已更新 ${selected}`);

  // 递归继续编辑
  await editConfig(configDir);
}
