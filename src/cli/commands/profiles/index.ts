import fs from "node:fs/promises";
import { execaCommand } from "execa";
import { createConfigStore } from "../../../config/store.js";
import { defaultProfile } from "../../../prompts/defaultProfile.js";
import {
  ensureDir,
  listProfiles,
  profileFilePath,
  writeProfileFile,
} from "../../../prompts/profiles.js";
import * as ui from "../../ui.js";

export type ProfilesAction = "list" | "init" | "open";

export async function profilesCmd(props: {
  action?: ProfilesAction;
  id?: string;
  intro?: boolean;
}) {
  if (props.intro !== false) ui.intro("litewiki");

  const store = createConfigStore();
  const conf = store.readAll();
  await ensureDir(conf.profilesDir);

  const act =
    props.action ||
    (await ui.select<ProfilesAction>({
      message: "profiles",
      options: [
        { value: "list", label: "list" },
        {
          value: "init",
          label: "init",
          hint: "写入 builtin default 到 profilesDir",
        },
        {
          value: "open",
          label: "open",
          hint: "用 $EDITOR 打开/创建一个 profile 文件",
        },
      ],
      initialValue: "list",
    }));
  if (!act) return;

  if (act === "list") {
    const list = await listProfiles(conf.profilesDir);
    ui.outro(
      list
        .map(
          (p) => `${p.id}\t${p.source === "builtin" ? "builtin" : p.filePath}`
        )
        .join("\n")
    );
    return;
  }

  if (act === "init") {
    const fp = profileFilePath(conf.profilesDir, defaultProfile.id);
    try {
      await fs.stat(fp);
      ui.outro(`已存在: ${fp}`);
      return;
    } catch {}
    await writeProfileFile(fp, defaultProfile);
    ui.outro(`已写入: ${fp}`);
    return;
  }

  if (act === "open") {
    const pid =
      props.id || (await ui.text("profile id", conf.defaultProfileId));
    if (!pid) return;

    const fp = profileFilePath(conf.profilesDir, pid);
    try {
      await fs.stat(fp);
    } catch {
      await writeProfileFile(fp, { ...defaultProfile, id: pid });
    }

    const ed = process.env.EDITOR;
    if (!ed || !ed.trim()) {
      ui.outro(`请手动编辑: ${fp}（设置 $EDITOR 可直接打开）`);
      return;
    }

    await execaCommand(`${ed} ${JSON.stringify(fp)}`, {
      stdio: "inherit",
      shell: true,
    });
    ui.outro(`已编辑: ${fp}`);
    return;
  }
}

export function registerProfilesCommand(cli: any) {
  cli
    .command("profiles [action] [id]", "管理 prompt profiles（list/init/open）")
    .action(async (action?: ProfilesAction, id?: string) => {
      await profilesCmd({ action, id, intro: true });
    });
}
