import { ensureDir } from "../../utils/fs.js";
import { createConfigStore } from "../../config/store.js";
import { getProfileById, listProfiles } from "../commands/profile/utils.js";
import { DEFAULT_PROFILE } from "../commands/profile/constant.js";
import { selectWithBack, BACK_VALUE, ui } from "../core/ui.js";

export async function pickProfileId(forcedId?: string): Promise<string | null> {
  const store = createConfigStore();
  const conf = store.readAll();
  await ensureDir(conf.profilesDir);

  if (forcedId) {
    const prof = await getProfileById(conf.profilesDir, forcedId);
    if (!prof) throw new Error(`Profile not found: ${forcedId}`);
    return prof.id;
  }

  const profiles = (await listProfiles(conf.profilesDir)).filter(
    (p) => p.id !== "undefined" && p.id !== "null"
  );
  const initial = (conf.lastProfileId || conf.defaultProfileId || DEFAULT_PROFILE.id) as string;
  const chosen = await selectWithBack<string>({
    message: "Prompt Profile",
    options: profiles.map((p) => ({
      value: p.id,
      label: p.id,
      hint: p.source === "builtin" ? "builtin" : "file",
    })),
    initialValue: initial,
  });
  if (!chosen || chosen === BACK_VALUE) return null;
  store.write("lastProfileId" as any, chosen as any);
  return chosen;
}
