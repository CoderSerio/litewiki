import { ensureDir } from "../../utils/fs.js";
import { createConfigStore } from "../../config/store.js";
import { ui } from "../core/ui.js";
import { selectWithBack, BACK_VALUE } from "../core/ui.js";
import {
  listProfiles,
  viewProfile,
  createProfile,
  editProfile,
  type LoadedProfile,
} from "../commands/profile/utils.js";
import { relativePath, shortenMiddle } from "../../utils/format.js";

export async function profilesController(props: { intro?: boolean }) {
  if (props.intro !== false) ui.intro("litewiki");

  const store = createConfigStore();
  const conf = store.readAll();
  await ensureDir(conf.profilesDir);

  type Ctx = { chosen?: string | "__new__"; profile?: LoadedProfile };
  const ctx: Ctx = {};

  async function listStep(): Promise<"list" | "create" | "detail" | "exit"> {
    const list = await listProfiles(conf.profilesDir);
    const good = list.filter((p) => p.id !== "undefined" && p.id !== "null");

    const options: { value: string; label: string; hint?: string }[] = [
      ...good.map((p) => ({
        value: p.id,
        label: p.id,
        hint:
          p.id === "default" || p.source === "builtin"
            ? "readonly"
            : shortenMiddle(relativePath(conf.profilesDir, p.filePath || ""), 60),
      })),
      { value: "__new__", label: "+ New profile" },
    ];

    const chosen = await selectWithBack<string>({
      message: "Select a profile",
      options,
      initialValue: conf.defaultProfileId,
    });
    if (!chosen || chosen === BACK_VALUE) return "exit";
    if (chosen === "__new__") {
      ctx.chosen = "__new__";
      return "create";
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
