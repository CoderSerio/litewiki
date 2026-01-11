import fs from "node:fs/promises";
import { execaCommand } from "execa";
import { createConfigStore } from "../../../config/store.js";
import { defaultProfile } from "./constant.js";
import { listProfiles, profileFilePath, writeProfileFile } from "./utils.js";
import * as ui from "../../ui.js";
import { relativePath, shortenMiddle } from "../../../utils/format.js";
import { ensureDir } from "../../../utils/fs.js";

export type ProfilesAction = "list" | "init" | "open";

function isValidProfileId(id: string) {
  // Only allow simple file names, avoid path traversal and weird shell behavior
  // Also avoid accidental pollution of the directory by "undefined/null"
  if (!id) return false;
  if (id === "undefined" || id === "null") return false;
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(id);
}

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
        // {
        //   value: "init",
        //   label: "init",
        //   hint: "写入 builtin default 到 profilesDir",
        // },
        // {
        //   value: "open",
        //   label: "open",
        //   hint: "用 $EDITOR 打开/创建一个 profile 文件",
        // },
      ],
      initialValue: "list",
    }));
  if (!act) return;

  if (act === "list") {
    const list = await listProfiles(conf.profilesDir);
    const good = list.filter((p) => p.id !== "undefined" && p.id !== "null");
    if (good.length === 0) {
      ui.outro("没有可用的 profiles");
      return;
    }

    const chosen = await ui.select<string>({
      message: "选择一个 profile",
      options: good.map((p) => ({
        value: p.id,
        label: p.id,
        hint:
          p.source === "builtin"
            ? "builtin"
            : shortenMiddle(
                relativePath(conf.profilesDir, p.filePath || ""),
                80
              ),
      })),
      initialValue: conf.defaultProfileId,
    });
    if (!chosen) return;

    ui.outro(`已选择: ${chosen}`);
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
    if (!isValidProfileId(pid)) {
      ui.outro(
        "无效的 profile id。允许：字母/数字开头，其余为字母/数字/._-，长度<=64；且不能是 undefined/null。"
      );
      process.exitCode = 1;
      return;
    }

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
      const args: { action?: ProfilesAction; id?: string; intro?: boolean } = {
        intro: true,
      };
      if (!!action) args.action = action;
      if (!!id) args.id = id;
      await profilesCmd(args);
    });
}
