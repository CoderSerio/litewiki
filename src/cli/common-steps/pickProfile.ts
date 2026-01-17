import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir } from "../../utils/fs.js";
import { createConfigStore } from "../../config/store.js";
import { getProfileById, listProfiles } from "../commands/profile/utils.js";
import { DEFAULT_PROFILE } from "../commands/profile/constant.js";
import { selectWithBack, BACK_VALUE, ui } from "../core/ui.js";
import { relativePath, shortenMiddle } from "../../utils/format.js";
import { maybeDeleteBrokenPath } from "./fileOps.js";

export async function pickProfileId(forcedId?: string): Promise<string | null> {
  const store = createConfigStore();
  const conf = store.readAll();
  await ensureDir(conf.profilesDir);

  if (forcedId) {
    const prof = await getProfileById(conf.profilesDir, forcedId);
    if (!prof) throw new Error(`Profile not found: ${forcedId}`);
    return prof.id;
  }

  while (true) {
    const profiles = (await listProfiles(conf.profilesDir)).filter(
      (p) => p.id !== "undefined" && p.id !== "null"
    );
    const ents = await fs.readdir(conf.profilesDir, { withFileTypes: true }).catch(() => []);
    const broken: { id: string; filePath: string }[] = [];
    for (const it of ents) {
      if (!it.isFile() || !it.name.endsWith(".json")) continue;
      const fp = path.join(conf.profilesDir, it.name);
      const already = profiles.find((p) => p.filePath === fp);
      if (already) continue;
      broken.push({ id: path.basename(it.name, ".json"), filePath: fp });
    }

    const initial = (conf.lastProfileId || conf.defaultProfileId || DEFAULT_PROFILE.id) as string;
    const chosen = await selectWithBack<string>({
      message: "Prompt Profile",
      options: [
        ...profiles.map((p) => ({
          value: p.id,
          label: p.id,
          hint: p.source === "builtin" ? "builtin, read-only" : "file",
        })),
        ...broken.map((b) => ({
          value: `broken::${b.filePath}`,
          label: `[broken] ${b.id}`,
          hint: shortenMiddle(relativePath(conf.profilesDir, b.filePath), 60),
        })),
      ],
      initialValue: initial,
    });
    if (!chosen || chosen === BACK_VALUE) return null;
    if (chosen.startsWith("broken::")) {
      const fp = chosen.slice("broken::".length);
      const deleted = await maybeDeleteBrokenPath({ targetPath: fp, reason: "Invalid or unparsable profile JSON" });
      if (deleted) {
        // builtin default lives in memory; no file bootstrap needed
      }
      // loop again
      continue;
    }
    store.write("lastProfileId" as any, chosen as any);
    return chosen;
  }
}
