import fs from "node:fs/promises";
import path from "node:path";
import { ui } from "../core/ui.js";
import { selectWithBack, BACK_VALUE } from "../core/ui.js";
import {
  listConfigs,
  saveConfig,
  deleteConfig,
  getActiveConfigId,
  setActiveConfigId,
  migrateLegacyConfigIfNeeded,
  type ConfigItem,
} from "../../services/configService.js";
import { ensureDir } from "../../utils/fs.js";
import { createConfigStore } from "../../config/store.js";
import { relativePath, shortenMiddle } from "../../utils/format.js";
import { maybeDeleteBrokenPath } from "../common-steps/fileOps.js";

export async function configController(props: { intro?: boolean }) {
  if (props.intro !== false) ui.intro("litewiki");
  const store = createConfigStore();
  const conf = store.readAll();
  await ensureDir(conf.configDir);
  await migrateLegacyConfigIfNeeded(conf.configDir);

  // main loop
  while (true) {
    const activeId = getActiveConfigId();
    const items = await listConfigs(conf.configDir);
    // find broken config .json files not parsed by listConfigs
    const ents = await fs.readdir(conf.configDir, { withFileTypes: true }).catch(() => []);
    const broken: { id: string; filePath: string }[] = [];
    for (const it of ents) {
      if (!it.isFile() || !it.name.endsWith(".json")) continue;
      const fp = path.join(conf.configDir, it.name);
      const found = items.find((i) => i.filePath === fp);
      if (!found) broken.push({ id: path.basename(it.name, ".json"), filePath: fp });
    }
    const opts = items.map((c) => ({
      value: c.id,
      label: c.id === activeId ? `${c.id} (active)` : c.id,
      hint: `${c.provider} / ${c.model} — ${shortenMiddle(relativePath(conf.configDir, c.filePath), 60)}`,
    }));
    const chosen = await selectWithBack<string>({
      message: "Configs",
      options: [
        ...opts,
        ...broken.map((b) => ({
          value: `broken::${b.filePath}`,
          label: `[broken] ${b.id}`,
          hint: shortenMiddle(relativePath(conf.configDir, b.filePath), 60),
        })),
        { value: "__new__", label: "+ New" } as any,
      ],
    });
    if (chosen === null) return; // cancel
    if (chosen === BACK_VALUE) return; // back to root
    const value = chosen as string;
    if (value.startsWith("broken::")) {
      const fp = value.slice("broken::".length);
      await maybeDeleteBrokenPath({ targetPath: fp, reason: "Invalid or unparsable config JSON" });
      continue; // refresh
    }
    if (value === "__new__") {
      await createNewConfigFlow(conf.configDir);
      continue;
    }
    const picked = items.find((i) => i.id === value);
    if (!picked) continue;
    await configDetailFlow(conf.configDir, picked);
  }
}

async function createNewConfigFlow(configDir: string) {
  const id = await ui.text("Config id");
  if (!id) return;
  const provider = (await ui.text("provider", "siliconflow")) || "siliconflow";
  const model = await ui.text("model");
  if (!model) return;
  const key = await ui.text("key");
  if (!key) return;
  const baseUrl = await ui.text("baseUrl (optional)");
  await saveConfig(configDir, { id, provider, model, key, baseUrl: baseUrl || undefined });
  setActiveConfigId(id);
  ui.log.success(`Created and activated: ${id}`);
}

async function configDetailFlow(configDir: string, cfg: ConfigItem) {
  while (true) {
    const chosen = await selectWithBack<
      "activate" | "edit" | "delete"
    >({
      message: `${cfg.id} (${cfg.provider})`,
      options: [
        { value: "activate", label: "Activate" },
        { value: "edit", label: "Edit" },
        { value: "delete", label: "Delete" },
      ],
    });
    if (!chosen || chosen === BACK_VALUE) return;
    const action = chosen as "activate" | "edit" | "delete";

    if (action === "activate") {
      setActiveConfigId(cfg.id);
      ui.log.success("Activated");
      return;
    }
    if (action === "delete") {
      await deleteConfig(configDir, cfg.id);
      ui.log.success("Deleted");
      return;
    }
    if (action === "edit") {
      cfg = await editConfigFlow(configDir, cfg);
      continue;
    }
  }
}

async function editConfigFlow(configDir: string, cfg: ConfigItem): Promise<ConfigItem> {
  // recursive edit: keep looping until back/done
  while (true) {
    const sel = await selectWithBack<"id" | "provider" | "model" | "key" | "baseUrl" | "done">({
      message: `Edit ${cfg.id}`,
      options: [
        { value: "id", label: `id: ${cfg.id}` },
        { value: "provider", label: `provider: ${cfg.provider}` },
        { value: "model", label: `model: ${cfg.model}` },
        { value: "key", label: `key: ${cfg.key ? "(set)" : "(empty)"}` },
        { value: "baseUrl", label: `baseUrl: ${cfg.baseUrl || "(empty)"}` },
        // { value: "done", label: "✓ Done" },
      ],
    });
    if (!sel || sel === BACK_VALUE || sel === "done") return cfg;

    if (sel === "id") {
      const newId = await ui.text("New id", cfg.id);
      if (!newId || newId === cfg.id) continue;
      // rename: create new file then delete old
      await saveConfig(configDir, { ...cfg, id: newId });
      await deleteConfig(configDir, cfg.id);
      cfg = { ...cfg, id: newId, filePath: cfg.filePath.replace(/[^/\\]+\.json$/, `${newId}.json`) };
      ui.log.success("Renamed");
      continue;
    }
    if (sel === "provider") {
      const v = await ui.text("provider", cfg.provider);
      if (!v) continue;
      cfg = await saveConfig(configDir, { ...cfg, provider: v });
      ui.log.success("Updated provider");
      continue;
    }
    if (sel === "model") {
      const v = await ui.text("model", cfg.model);
      if (!v) continue;
      cfg = await saveConfig(configDir, { ...cfg, model: v });
      ui.log.success("Updated model");
      continue;
    }
    if (sel === "key") {
      const v = await ui.text("key", cfg.key);
      if (!v) continue;
      cfg = await saveConfig(configDir, { ...cfg, key: v });
      ui.log.success("Updated key");
      continue;
    }
    if (sel === "baseUrl") {
      const v = await ui.text("baseUrl (optional)", cfg.baseUrl || "");
      cfg = await saveConfig(configDir, { ...cfg, baseUrl: v || undefined });
      ui.log.success("Updated baseUrl");
      continue;
    }
  }
}
