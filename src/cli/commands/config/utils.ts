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

export async function showConfig(configDir: string) {
  const config = await getConfig(configDir);
  ui.log.message(JSON.stringify(config, null, 2));
}

export async function setConfig(configDir: string) {
  const config = await getConfig(configDir);
  const selected = await ui.select<keyof Config>({
    message: "选择要修改的配置",
    options: [
      { value: "provider", label: `provider: ${config.provider || "(空)"}` },
      { value: "model", label: `model: ${config.model || "(空)"}` },
      { value: "key", label: `key: ${config.key || "(空)"}` },
    ],
  });

  if (!selected) return;

  const newValue = await ui.text(`输入新的 ${selected}`, config[selected]);
  if (newValue === null) return;

  config[selected] = newValue;
  await saveConfig(configDir, config);
  ui.log.success(`已更新 ${selected}`);
}
