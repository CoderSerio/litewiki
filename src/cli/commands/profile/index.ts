import { createConfigStore } from "../../../config/store.js";
import {
  listProfiles,
  editProfile,
  viewProfile,
  createProfile,
} from "./utils.js";
import * as ui from "../../ui.js";
import { relativePath, shortenMiddle } from "../../../utils/format.js";
import { ensureDir } from "../../../utils/fs.js";

export async function profilesCmd(props: { intro?: boolean }) {
  if (props.intro !== false) ui.intro("litewiki");

  const store = createConfigStore();
  const conf = store.readAll();
  await ensureDir(conf.profilesDir);

  // 获取 profile 列表
  const list = await listProfiles(conf.profilesDir);
  const good = list.filter((p) => p.id !== "undefined" && p.id !== "null");

  // 构建选项：profile 列表 + new
  type OptionValue = string | "__new__";
  const options: { value: OptionValue; label: string; hint?: string }[] = [
    ...good.map((p) => ({
      value: p.id as OptionValue,
      label: p.id,
      hint:
        p.id === "default" || p.source === "builtin"
          ? "只读"
          : shortenMiddle(relativePath(conf.profilesDir, p.filePath || ""), 60),
    })),
    { value: "__new__", label: "+ 新建 profile" },
  ];

  const chosen = await ui.select<OptionValue>({
    message: "选择 profile",
    options,
    initialValue: conf.defaultProfileId,
  });

  if (!chosen) return;

  // 新建
  if (chosen === "__new__") {
    await createProfile(conf.profilesDir);
    return;
  }

  // 找到选中的 profile
  const profile = good.find((p) => p.id === chosen);
  if (!profile) return;

  // default 始终只读（不管是 builtin 还是文件版本）
  if (profile.id === "default" || profile.source === "builtin") {
    await viewProfile(profile);
    return;
  }

  // 自定义 profile 可编辑
  await editProfile(conf.profilesDir, profile);
}

export function registerProfilesCommand(cli: any) {
  cli.command("profiles", "管理 prompt profiles").action(async () => {
    await profilesCmd({ intro: true });
  });
}
