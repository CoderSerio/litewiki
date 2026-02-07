import fs from "node:fs/promises";
import path from "node:path";
import {
  PROVIDERS,
  isProviderSupported,
  normalizeProviderId,
} from "../../agent/providers/providerCatalog.js";
import { createConfigStore } from "../../config/store.js";
import { SUPPORTED_LOCALES, setLocale, t } from "../../i18n/index.js";
import {
  type ConfigItem,
  deleteConfig,
  getActiveConfigId,
  listConfigs,
  migrateLegacyConfigIfNeeded,
  saveConfig,
  setActiveConfigId,
} from "../../services/configService.js";
import { relativePath, shortenMiddle } from "../../utils/format.js";
import { ensureDir } from "../../utils/fs.js";
import { maybeDeleteBrokenPath } from "../common-steps/fileOps.js";
import { ui } from "../core/ui.js";
import { BACK_VALUE, selectWithBack } from "../core/ui.js";

function providerOptions() {
  return PROVIDERS.map((p) => {
    const label =
      p.status === "supported" ? p.label : `${p.label} (unsupported)`;
    const opt: { value: typeof p.id; label: string; hint?: string } = {
      value: p.id,
      label,
    };
    if (p.hint) opt.hint = p.hint;
    return opt;
  });
}

export async function configController(props: { intro?: boolean }) {
  if (props.intro !== false) ui.intro(t("cli.title"));
  const store = createConfigStore();
  const conf = store.readAll();
  await ensureDir(conf.configDir);
  await migrateLegacyConfigIfNeeded(conf.configDir);

  // main loop
  while (true) {
    const activeId = getActiveConfigId();
    const items = await listConfigs(conf.configDir);
    // find broken config .json files not parsed by listConfigs
    const ents = await fs
      .readdir(conf.configDir, { withFileTypes: true })
      .catch(() => []);
    const broken: { id: string; filePath: string }[] = [];
    for (const it of ents) {
      if (!it.isFile() || !it.name.endsWith(".json")) continue;
      const fp = path.join(conf.configDir, it.name);
      const found = items.find((i) => i.filePath === fp);
      if (!found)
        broken.push({ id: path.basename(it.name, ".json"), filePath: fp });
    }
    const opts = items.map((c) => ({
      value: c.id,
      label: c.id === activeId ? t("config.active", { id: c.id }) : c.id,
      hint: `${c.provider} / ${c.model} — ${shortenMiddle(relativePath(conf.configDir, c.filePath), 60)}`,
    }));
    const chosen = await selectWithBack<string>({
      message: t("config.title"),
      options: [
        ...opts,
        ...broken.map((b) => ({
          value: `broken::${b.filePath}`,
          label: `${t("config.broken")} ${b.id}`,
          hint: shortenMiddle(relativePath(conf.configDir, b.filePath), 60),
        })),
        {
          value: "__new__",
          label: t("config.new"),
          hint: t("config.new.hint"),
        } as any,
        {
          value: "__locale__",
          label: t("cli.action.language"),
          hint: t("cli.action.language.hint"),
        } as any,
      ],
    });
    if (chosen === null) return; // cancel
    if (chosen === BACK_VALUE) return; // back to root
    const value = chosen as string;
    if (value.startsWith("broken::")) {
      const fp = value.slice("broken::".length);
      await maybeDeleteBrokenPath({
        targetPath: fp,
        reason: t("config.broken.reason"),
      });
      continue; // refresh
    }
    if (value === "__new__") {
      await createNewConfigFlow(conf.configDir);
      continue;
    }
    if (value === "__locale__") {
      const locale = await ui.select<any>({
        message: t("language.select"),
        options: SUPPORTED_LOCALES,
      });
      if (locale) {
        setLocale(locale);
        ui.log.success(t("language.changed"));
      }
      continue;
    }
    const picked = items.find((i) => i.id === value);
    if (!picked) continue;
    await configDetailFlow(conf.configDir, picked);
  }
}

async function createNewConfigFlow(configDir: string) {
  const id = await ui.text(t("config.id"));
  if (!id) return;
  const provider = await ui.select({
    message: t("config.provider"),
    options: providerOptions(),
    initialValue: "openai",
  });
  if (!provider) return;
  if (!isProviderSupported(provider)) {
    ui.log.warn(t("config.provider.unsupported", { provider }));
    const ok = await ui.confirm(
      t("config.provider.unsupported.confirm"),
      false,
    );
    if (!ok) return;
  }
  const model = await ui.text(t("config.model"));
  if (!model) return;
  const key = await ui.text(t("config.key"));
  if (!key) return;
  const baseUrl = await ui.text(t("config.baseUrl"));
  if (!baseUrl) return;
  await saveConfig(configDir, { id, provider, model, key, baseUrl });
  setActiveConfigId(id);
  ui.log.success(t("config.created", { id }));
}

async function configDetailFlow(configDir: string, cfg: ConfigItem) {
  while (true) {
    const chosen = await selectWithBack<"activate" | "edit" | "delete">({
      message: `${cfg.id} (${cfg.provider})`,
      options: [
        {
          value: "activate",
          label: t("config.activate"),
          hint: t("config.activate.hint"),
        },
        {
          value: "edit",
          label: t("config.edit"),
          hint: t("config.edit.hint"),
        },
        {
          value: "delete",
          label: t("config.delete"),
          hint: t("config.delete.hint"),
        },
      ],
    });
    if (!chosen || chosen === BACK_VALUE) return;
    const action = chosen as "activate" | "edit" | "delete";

    if (action === "activate") {
      setActiveConfigId(cfg.id);
      ui.log.success(t("config.activated"));
      return;
    }
    if (action === "delete") {
      await deleteConfig(configDir, cfg.id);
      ui.log.success(t("config.deleted"));
      return;
    }
    if (action === "edit") {
      cfg = await editConfigFlow(configDir, cfg);
      continue;
    }
  }
}

async function editConfigFlow(
  configDir: string,
  cfg: ConfigItem,
): Promise<ConfigItem> {
  // recursive edit: keep looping until back/done
  while (true) {
    const sel = await selectWithBack<
      "id" | "provider" | "model" | "key" | "baseUrl" | "done"
    >({
      message: t("config.edit.title", { id: cfg.id }),
      options: [
        {
          value: "id",
          label: t("config.edit.id", { value: cfg.id }),
          hint: t("config.edit.id.hint"),
        },
        {
          value: "provider",
          label: t("config.edit.provider", { value: cfg.provider }),
          hint: t("config.edit.provider.hint"),
        },
        {
          value: "model",
          label: t("config.edit.model", { value: cfg.model }),
          hint: t("config.edit.model.hint"),
        },
        {
          value: "key",
          label: t("config.edit.key", {
            value: cfg.key ? t("common.set") : t("common.empty"),
          }),
          hint: t("config.edit.key.hint"),
        },
        {
          value: "baseUrl",
          label: t("config.edit.baseUrl", {
            value: cfg.baseUrl || t("common.empty"),
          }),
          hint: t("config.edit.baseUrl.hint"),
        },
      ],
    });
    if (!sel || sel === BACK_VALUE || sel === "done") return cfg;

    if (sel === "id") {
      const newId = await ui.text(t("config.edit.newId"), cfg.id);
      if (!newId || newId === cfg.id) continue;
      // rename: create new file then delete old
      await saveConfig(configDir, { ...cfg, id: newId });
      await deleteConfig(configDir, cfg.id);
      cfg = {
        ...cfg,
        id: newId,
        filePath: cfg.filePath.replace(/[^/\\]+\.json$/, `${newId}.json`),
      };
      ui.log.success(t("config.renamed"));
      continue;
    }
    if (sel === "provider") {
      const v = await ui.select({
        message: t("config.provider"),
        options: providerOptions() as any,
        initialValue: normalizeProviderId(cfg.provider),
      });
      if (!v) continue;
      if (!isProviderSupported(v)) {
        ui.log.warn(t("config.provider.unsupported", { provider: v }));
        const ok = await ui.confirm(
          t("config.provider.unsupported.confirm"),
          false,
        );
        if (!ok) continue;
      }
      cfg = await saveConfig(configDir, { ...cfg, provider: v });
      ui.log.success(t("config.updated.provider"));
      continue;
    }
    if (sel === "model") {
      const v = await ui.text(t("config.model"), cfg.model);
      if (!v) continue;
      cfg = await saveConfig(configDir, { ...cfg, model: v });
      ui.log.success(t("config.updated.model"));
      continue;
    }
    if (sel === "key") {
      const v = await ui.text(t("config.key"), cfg.key);
      if (!v) continue;
      cfg = await saveConfig(configDir, { ...cfg, key: v });
      ui.log.success(t("config.updated.key"));
      continue;
    }
    if (sel === "baseUrl") {
      const v = await ui.text(t("config.baseUrl"), cfg.baseUrl || "");
      if (!v) continue;
      cfg = await saveConfig(configDir, { ...cfg, baseUrl: v });
      ui.log.success(t("config.updated.baseUrl"));
      continue;
    }
  }
}
