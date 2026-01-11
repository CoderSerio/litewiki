import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { defaultProfile, type PromptProfile } from "./constant.js";
import { ensureDir } from "../../../utils/fs.js";
import * as ui from "../../ui.js";
import { shortenMiddle } from "../../../utils/format.js";

const ProfileSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  systemPrompt: z.string().min(1),
  extensions: z.array(z.string()).optional(),
  outputFormat: z.literal("markdown"),
});

export type LoadedProfile = PromptProfile & {
  source: "builtin" | "file";
  filePath?: string;
};

export function profileFilePath(profilesDir: string, id: string) {
  return path.join(profilesDir, `${id}.json`);
}

export async function loadProfileFromFile(
  filePath: string
): Promise<LoadedProfile> {
  const raw = await fs.readFile(filePath, "utf-8");
  const json = JSON.parse(raw);
  const parsed = ProfileSchema.parse(json);

  return { ...parsed, source: "file", filePath } as LoadedProfile;
}

export async function listProfiles(
  profilesDir: string
): Promise<LoadedProfile[]> {
  const items = await fs
    .readdir(profilesDir, { withFileTypes: true })
    .catch(() => []);
  const results: LoadedProfile[] = [{ ...defaultProfile, source: "builtin" }];

  for (const it of items) {
    if (!it.isFile()) continue;
    if (!it.name.endsWith(".json")) continue;
    const fp = path.join(profilesDir, it.name);
    try {
      const prof = await loadProfileFromFile(fp);
      // 文件同名覆盖 builtin（例如 default.json）
      const idx = results.findIndex((p) => p.id === prof.id);
      if (idx >= 0) results[idx] = prof;
      else results.push(prof);
    } catch {
      // 坏文件直接忽略：CLI 可用性优先；需要时再做 profiles doctor
      continue;
    }
  }

  return results;
}

export async function getProfileById(
  profilesDir: string,
  id: string
): Promise<LoadedProfile | null> {
  if (id === defaultProfile.id) return { ...defaultProfile, source: "builtin" };
  const fp = profileFilePath(profilesDir, id);
  try {
    return await loadProfileFromFile(fp);
  } catch {
    return null;
  }
}

export async function writeProfileFile(
  filePath: string,
  profile: PromptProfile
) {
  await ensureDir(path.dirname(filePath));
  const data = ProfileSchema.parse(profile);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

/** 查看 builtin profile（只读） */
export async function viewProfile(profile: LoadedProfile): Promise<void> {
  ui.log.info(`[只读] ${profile.id}`);
  ui.log.message(`version: ${profile.version}`);
  ui.log.message(`outputFormat: ${profile.outputFormat}`);
  ui.log.message(`systemPrompt:\n${profile.systemPrompt}`);
  if (profile.extensions?.length) {
    ui.log.message(
      `extensions:\n${profile.extensions.map((e) => `  - ${e}`).join("\n")}`
    );
  }
}

/** 创建新 profile */
export async function createProfile(profilesDir: string): Promise<void> {
  const id = await ui.text("新 profile 的 id");
  if (!id) return;

  // 检查是否已存在
  const fp = profileFilePath(profilesDir, id);
  const exists = await fs.stat(fp).catch(() => false);
  if (exists) {
    ui.log.error(`已存在: ${id}`);
    return;
  }

  // 基于 default 创建
  const newProfile: PromptProfile = {
    ...defaultProfile,
    id,
  };

  await writeProfileFile(fp, newProfile);
  ui.log.success(`已创建: ${fp}`);

  // 进入编辑
  const loaded = await loadProfileFromFile(fp);
  await editProfile(profilesDir, loaded);
}

type EditableField = "id" | "version" | "systemPrompt" | "extensions" | "done";

/** 编辑自定义 profile */
export async function editProfile(
  profilesDir: string,
  profile: LoadedProfile
): Promise<void> {
  const filePath = profile.filePath!;

  // 显示所有字段
  const selected = await ui.select<EditableField>({
    message: `编辑 ${profile.id}`,
    options: [
      { value: "id", label: `id: ${profile.id}` },
      { value: "version", label: `version: ${profile.version}` },
      {
        value: "systemPrompt",
        label: `systemPrompt: ${shortenMiddle(profile.systemPrompt, 40)}`,
      },
      {
        value: "extensions",
        label: `extensions: ${profile.extensions?.length || 0} 条`,
      },
      { value: "done", label: "✓ 完成" },
    ],
  });

  if (!selected || selected === "done") return;

  if (selected === "id") {
    const newId = await ui.text("输入新的 id", profile.id);
    if (!newId || newId === profile.id) {
      await editProfile(profilesDir, profile);
      return;
    }

    // 重命名文件
    const newPath = profileFilePath(profilesDir, newId);
    const updatedProfile: PromptProfile = { ...profile, id: newId };
    await writeProfileFile(newPath, updatedProfile);
    await fs.unlink(filePath);
    ui.log.success(`已重命名为 ${newId}`);

    await editProfile(profilesDir, {
      ...updatedProfile,
      source: "file",
      filePath: newPath,
    });
    return;
  }

  if (selected === "version") {
    const newVersion = await ui.text(
      "输入新的 version",
      String(profile.version)
    );
    if (!newVersion) {
      await editProfile(profilesDir, profile);
      return;
    }

    const v = parseInt(newVersion, 10);
    if (isNaN(v) || v < 1) {
      ui.log.error("version 必须是正整数");
      await editProfile(profilesDir, profile);
      return;
    }

    profile.version = v;
    await writeProfileFile(filePath, profile);
    ui.log.success("已更新 version");
    await editProfile(profilesDir, profile);
    return;
  }

  if (selected === "systemPrompt") {
    ui.log.info("当前 systemPrompt:");
    ui.log.message(profile.systemPrompt);

    const newPrompt = await ui.text("输入新的 systemPrompt（留空取消）");
    if (!newPrompt) {
      await editProfile(profilesDir, profile);
      return;
    }

    profile.systemPrompt = newPrompt;
    await writeProfileFile(filePath, profile);
    ui.log.success("已更新 systemPrompt");
    await editProfile(profilesDir, profile);
    return;
  }

  if (selected === "extensions") {
    ui.log.info("当前 extensions:");
    if (profile.extensions?.length) {
      profile.extensions.forEach((e, i) => ui.log.message(`  ${i + 1}. ${e}`));
    } else {
      ui.log.message("  (空)");
    }

    const action = await ui.select<"add" | "clear" | "back">({
      message: "操作",
      options: [
        { value: "add", label: "添加一条" },
        { value: "clear", label: "清空全部" },
        { value: "back", label: "← 返回" },
      ],
    });

    if (!action || action === "back") {
      await editProfile(profilesDir, profile);
      return;
    }

    if (action === "add") {
      const ext = await ui.text("输入新的 extension");
      if (ext) {
        profile.extensions = [...(profile.extensions || []), ext];
        await writeProfileFile(filePath, profile);
        ui.log.success("已添加");
      }
    }

    if (action === "clear") {
      profile.extensions = [];
      await writeProfileFile(filePath, profile);
      ui.log.success("已清空");
    }

    await editProfile(profilesDir, profile);
    return;
  }
}
