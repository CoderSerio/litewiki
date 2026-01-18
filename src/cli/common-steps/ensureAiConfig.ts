import fs from "node:fs/promises";
import path from "node:path";
import {
  PROVIDERS,
  isProviderSupported,
  normalizeProviderId,
} from "../../agent/providers/providerCatalog.js";
import { createConfigStore } from "../../config/store.js";
import {
  type ConfigItem,
  ConfigSchema,
  getActiveConfigId,
  listConfigs,
  migrateLegacyConfigIfNeeded,
} from "../../services/configService.js";
import { relativePath, shortenMiddle } from "../../utils/format.js";
import { ensureDir } from "../../utils/fs.js";
import { configController } from "../controllers/configController.js";
import { BACK_VALUE, selectWithBack, ui } from "../core/ui.js";
import { maybeDeleteBrokenPath } from "./fileOps.js";

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

export type AiConfigLike = {
  provider: string;
  model: string;
  key: string;
  baseUrl: string;
};

export async function ensureAiConfig(): Promise<AiConfigLike | null> {
  const store = createConfigStore();
  const conf = store.readAll();
  await ensureDir(conf.configDir);
  await migrateLegacyConfigIfNeeded(conf.configDir);
  let shownNoConfigHint = false;

  const pickActive = async (): Promise<AiConfigLike | null> => {
    const active = getActiveConfigId();
    if (!active) return null;
    const all = await listConfigs(conf.configDir);
    const found = all.find((c) => c.id === active);
    if (!found) return null;
    if (!found.provider || !found.model || !found.key || !found.baseUrl)
      return null;
    const provider = normalizeProviderId(found.provider);
    if (!isProviderSupported(provider)) return null;
    return { ...found, provider };
  };

  const ready = await pickActive();
  if (ready) return ready;

  // helper: list broken config files (json files that are not parsed by listConfigs)
  const listBrokenConfigs = async () => {
    const all = await listConfigs(conf.configDir);
    const ents = await fs
      .readdir(conf.configDir, { withFileTypes: true })
      .catch(() => []);
    const broken: { id: string; filePath: string; error?: string }[] = [];
    for (const it of ents) {
      if (!it.isFile() || !it.name.endsWith(".json")) continue;
      const fp = path.join(conf.configDir, it.name);
      const found = all.find((i) => i.filePath === fp);
      if (!found) {
        let id = path.basename(it.name, ".json");
        try {
          const raw = JSON.parse(await fs.readFile(fp, "utf-8"));
          if (typeof raw?.id === "string" && raw.id.trim()) id = raw.id.trim();
          try {
            ConfigSchema.parse({ ...raw, id });
          } catch (e) {
            broken.push({ id, filePath: fp, error: String(e) });
            continue;
          }
        } catch (e) {
          // keep fallback id from filename
          broken.push({ id, filePath: fp, error: String(e) });
          continue;
        }
        broken.push({ id, filePath: fp });
      }
    }
    return broken;
  };

  // selection loop until user provides a config or cancels
  while (true) {
    const brokenSummary = await listBrokenConfigs();
    const brokenWithError = brokenSummary.filter((b) => b.error);
    for (const it of brokenWithError) {
      ui.log.error(`Broken config JSON: ${it.filePath}\n${it.error}`);
    }
    const validConfigs = await listConfigs(conf.configDir);
    if (
      validConfigs.length === 0 &&
      brokenSummary.length === 0 &&
      !shownNoConfigHint
    ) {
      ui.log.error("No valid config found");
      ui.log.info(`Configs dir: ${conf.configDir}`);
      ui.log.info(`Profiles dir: ${conf.profilesDir}`);
      ui.log.info("Please create a config for your model provider.");
      shownNoConfigHint = true;
      const open = await ui.confirm(
        "No config found. Open config manager to create one?",
        true,
      );
      if (open) {
        await configController({ intro: true });
        const again = await pickActive();
        if (again) return again;
      }
    }
    const choice = await selectWithBack<"manage" | "temp" | "clean">({
      message: "No valid config. How to continue?",
      options: [
        {
          value: "manage",
          label: "manage configs",
          hint: "open the config manager to pick, create, and activate",
        },
        {
          value: "temp",
          label: "use a temporary config",
          hint: "input provider/model/key for this run only",
        },
        {
          value: "clean",
          label: "clean invalid configs",
          hint: "delete configs that failed to load",
        },
      ],
    });
    if (!choice || choice === BACK_VALUE) return null;

    if (choice === "manage") {
      await configController({ intro: true });
      const again = await pickActive();
      if (again) return again;
      // still not ready; loop again
      continue;
    }

    if (choice === "clean") {
      while (true) {
        const broken = await listBrokenConfigs();
        if (broken.length === 0) {
          ui.log.info("No invalid configs found");
          break;
        }
        if (broken.length === 1) {
          const only = broken[0];
          if (!only) break;
          await maybeDeleteBrokenPath({
            targetPath: only.filePath,
            reason: "Invalid or unparsable config JSON",
          });
          continue;
        }
        const pick = await selectWithBack<string>({
          message: "Pick a broken config to delete",
          options: broken.map((b) => ({
            value: b.filePath,
            label: `[broken] ${b.id}`,
            hint: shortenMiddle(relativePath(conf.configDir, b.filePath), 60),
          })),
        });
        if (!pick || pick === BACK_VALUE) break;
        await maybeDeleteBrokenPath({
          targetPath: pick,
          reason: "Invalid or unparsable config JSON",
        });
      }
      const again = await pickActive();
      if (again) return again;
      const rebuild = await ui.confirm(
        "No valid configs remain. Open config manager to create one?",
        true,
      );
      if (rebuild) {
        await configController({ intro: true });
        const after = await pickActive();
        if (after) return after;
      }
      return null;
    }

    // temp
    const provider = await ui.select({
      message: "provider",
      options: providerOptions(),
      initialValue: "openai",
    });
    if (!provider) return null;
    if (!isProviderSupported(provider)) {
      ui.log.warn(
        `Provider "${provider}" is not supported yet; run will fail for now.`,
      );
      const ok = await ui.confirm("仍然继续吗？", false);
      if (!ok) return null;
    }
    const model = await ui.text("model");
    if (!model) return null;
    const key = await ui.text("key");
    if (!key) return null;
    const baseUrl = await ui.text("baseUrl");
    if (!baseUrl) return null;
    return { provider, model, key, baseUrl };
  }
}
