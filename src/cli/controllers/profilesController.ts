import fs from "node:fs/promises";
import path from "node:path";
import { createConfigStore } from "../../config/store.js";
import { t } from "../../i18n/index.js";
import { relativePath, shortenMiddle } from "../../utils/format.js";
import { ensureDir } from "../../utils/fs.js";
import {
  type LoadedProfile,
  createProfile,
  editProfile,
  listProfiles,
  viewProfile,
} from "../commands/profile/utils.js";
import { maybeDeleteBrokenPath } from "../common-steps/fileOps.js";
import { ui } from "../core/ui.js";
import { BACK_VALUE, selectWithBack } from "../core/ui.js";

export async function profilesController(props: { intro?: boolean }) {
  if (props.intro !== false) ui.intro(t("cli.title"));

  const store = createConfigStore();
  const conf = store.readAll();
  await ensureDir(conf.profilesDir);
  // builtin default lives in memory; no file bootstrap needed

  type Ctx = { chosen?: string | "__new__"; profile?: LoadedProfile };
  const ctx: Ctx = {};

  async function listStep(): Promise<"list" | "create" | "detail" | "exit"> {
    const list = await listProfiles(conf.profilesDir);
    const good = list.filter((p) => p.id !== "undefined" && p.id !== "null");

    // find broken .json files that failed to parse
    const ents = await fs
      .readdir(conf.profilesDir, { withFileTypes: true })
      .catch(() => []);
    const broken: { id: string; filePath: string }[] = [];
    for (const it of ents) {
      if (!it.isFile() || !it.name.endsWith(".json")) continue;
      const fp = path.join(conf.profilesDir, it.name);
      const already = good.find((p) => p.filePath === fp);
      if (already) continue;
      try {
        // try parse; if parse succeeds but wasn't in good, treat as good (rare)
        // we won't push to good here to avoid duplication; treat as broken by default
        await fs.readFile(fp, "utf-8").then((r) => JSON.parse(r));
        // still treat as broken, because shape may be invalid
      } catch {
        // parse error -> broken
      }
      broken.push({ id: path.basename(it.name, ".json"), filePath: fp });
    }

    const options: { value: string; label: string; hint?: string }[] = [
      ...good.map((p) => ({
        value: p.id,
        label: p.id,
        hint:
          p.id === "default" || p.source === "builtin"
            ? t("profile.builtin")
            : shortenMiddle(
                relativePath(conf.profilesDir, p.filePath || ""),
                60,
              ),
      })),
      ...broken.map((b) => ({
        value: `broken::${b.filePath}`,
        label: `${t("profile.broken")} ${b.id}`,
        hint: shortenMiddle(relativePath(conf.profilesDir, b.filePath), 60),
      })),
      {
        value: "__new__",
        label: t("profile.new"),
        hint: t("profile.new.hint"),
      },
    ];

    const chosen = await selectWithBack<string>({
      message: t("profile.select"),
      options,
      initialValue: conf.defaultProfileId,
    });
    if (!chosen || chosen === BACK_VALUE) return "exit";
    if (chosen === "__new__") {
      ctx.chosen = "__new__";
      return "create";
    }
    if (chosen.startsWith("broken::")) {
      const fp = chosen.slice("broken::".length);
      const deleted = await maybeDeleteBrokenPath({
        targetPath: fp,
        reason: t("profile.broken.reason"),
      });
      if (deleted) {
        // builtin default lives in memory; no file bootstrap needed
      }
      return "list"; // refresh list
    }
    const profile = good.find((p) => p.id === chosen);
    if (!profile) return "list";
    ctx.chosen = chosen;
    ctx.profile = profile;
    return "detail";
  }

  while (true) {
    const next = await listStep();
    if (next === "exit") return;
    if (next === "create") {
      await createProfile(conf.profilesDir);
      // then loop back to list
      continue;
    }
    if (next === "detail") {
      if (!ctx.profile) {
        continue;
      }
      if (ctx.profile.id === "default" || ctx.profile.source === "builtin") {
        await viewProfile(ctx.profile);
        // then go back to list
        continue;
      }
      await editProfile(conf.profilesDir, ctx.profile);
      // after editing, back to list
      continue;
    }
  }
}
