import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { DEFAULT_PROFILE, type PromptProfile } from "./constant.js";
import { ensureDir } from "../../../utils/fs.js";
import * as ui from "../../ui.js";
import { selectWithBack, BACK_VALUE } from "../../core/ui.js";
import { shortenMiddle } from "../../../utils/format.js";

const RESERVED_IDS = new Set(["undefined", "null"]);
const ProfileIdSchema = z
  .string()
  .min(1, "id must not be empty")
  .max(64, "id too long (max 64)")
  .regex(/^[a-zA-Z0-9._-]+$/, "id can only contain letters, digits, dot, underscore, and hyphen")
  .refine((id) => !RESERVED_IDS.has(id.toLowerCase()), {
    message: "id is a reserved word (undefined/null)",
  });

const ProfileSchema = z.object({
  id: ProfileIdSchema,
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

  const source = parsed.id === DEFAULT_PROFILE.id ? "builtin" : "file";

  return { ...parsed, source, filePath } as LoadedProfile;
}

export async function listProfiles(
  profilesDir: string
): Promise<LoadedProfile[]> {
  const items = await fs
    .readdir(profilesDir, { withFileTypes: true })
    .catch(() => []);
  const results: LoadedProfile[] = [{ ...DEFAULT_PROFILE, source: "builtin" }];

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
  if (id === DEFAULT_PROFILE.id) return { ...DEFAULT_PROFILE, source: "builtin" };
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

/** Ensure there's at least one profile file; if none, create default.json */

/** View builtin profile (readonly) */
export async function viewProfile(profile: LoadedProfile): Promise<void> {
  ui.log.info(`[readonly] ${profile.id}`);
  ui.log.message(`version: ${profile.version}`);
  ui.log.message(`outputFormat: ${profile.outputFormat}`);
  ui.log.message(`systemPrompt:\n${profile.systemPrompt}`);
  if (profile.extensions?.length) {
    ui.log.message(
      `extensions:\n${profile.extensions.map((e) => `  - ${e}`).join("\n")}`
    );
  }
}

/** Create a new profile */
export async function createProfile(profilesDir: string): Promise<void> {
  const id = await ui.text("New profile id");
  if (!id) return;

  // Check if exists
  const fp = profileFilePath(profilesDir, id);
  const exists = await fs.stat(fp).catch(() => false);
  if (exists) {
    ui.log.error(`Already exists: ${id}`);
    return;
  }

  // Create based on default
  const newProfile: PromptProfile = {
    ...DEFAULT_PROFILE,
    id,
  };

  try {
    await writeProfileFile(fp, newProfile);
  } catch (e: any) {
    ui.log.error(`Create failed: ${String(e?.errors?.[0]?.message || e?.message || e)}`);
    return;
  }
  ui.log.success(`Created: ${fp}`);

  // 进入编辑
  const loaded = await loadProfileFromFile(fp);
  await editProfile(profilesDir, loaded);
}

type EditableField = "id" | "version" | "systemPrompt" | "extensions" | "done";

/** Edit a custom profile */
export async function editProfile(
  profilesDir: string,
  profile: LoadedProfile
): Promise<void> {
  const filePath = profile.filePath!;

  // Show all fields
  const selected = await selectWithBack<EditableField>({
    message: `Edit ${profile.id}`,
    options: [
      { value: "id", label: `id: ${profile.id}`, hint: "rename this profile" },
      { value: "version", label: `version: ${profile.version}`, hint: "update the version number" },
      {
        value: "systemPrompt",
        label: `systemPrompt: ${shortenMiddle(profile.systemPrompt, 40)}`,
        hint: "edit the system prompt text",
      },
      {
        value: "extensions",
        label: `extensions: ${profile.extensions?.length || 0} items`,
        hint: "manage the extension list",
      },
      // { value: "done", label: "✓ Done" },
    ],
  });

  if (!selected || selected === BACK_VALUE || selected === "done") return;

  if (selected === "id") {
    const newId = await ui.text("New id", profile.id);
    if (!newId || newId === profile.id) {
      await editProfile(profilesDir, profile);
      return;
    }

    // Validate new id
    try {
      ProfileIdSchema.parse(newId);
    } catch (e: any) {
      ui.log.error(String(e?.errors?.[0]?.message || e?.message || e));
      await editProfile(profilesDir, profile);
      return;
    }

    // Do not overwrite existing file
    const newPath = profileFilePath(profilesDir, newId);
    const exists = await fs.stat(newPath).then(() => true).catch(() => false);
    if (exists) {
      ui.log.error(`Already exists: ${newId}`);
      await editProfile(profilesDir, profile);
      return;
    }

    // Rename file
    const updatedProfile: PromptProfile = { ...profile, id: newId };
    try {
      await writeProfileFile(newPath, updatedProfile);
      await fs.unlink(filePath);
      ui.log.success(`Renamed to ${newId}`);
    } catch (e: any) {
      ui.log.error(`Rename failed: ${String(e?.errors?.[0]?.message || e?.message || e)}`);
      await editProfile(profilesDir, profile);
      return;
    }

    await editProfile(profilesDir, {
      ...updatedProfile,
      source: "file",
      filePath: newPath,
    });
    return;
  }

  if (selected === "version") {
    const newVersion = await ui.text(
      "New version",
      String(profile.version)
    );
    if (!newVersion) {
      await editProfile(profilesDir, profile);
      return;
    }

    const v = parseInt(newVersion, 10);
    if (isNaN(v) || v < 1) {
      ui.log.error("version must be a positive integer");
      await editProfile(profilesDir, profile);
      return;
    }

    profile.version = v;
    await writeProfileFile(filePath, profile);
    ui.log.success("Updated version");
    await editProfile(profilesDir, profile);
    return;
  }

  if (selected === "systemPrompt") {
    ui.log.info("Current systemPrompt:");
    ui.log.message(profile.systemPrompt);

    const newPrompt = await ui.text("New systemPrompt (leave empty to cancel)");
    if (!newPrompt) {
      await editProfile(profilesDir, profile);
      return;
    }

    profile.systemPrompt = newPrompt;
    await writeProfileFile(filePath, profile);
    ui.log.success("Updated systemPrompt");
    await editProfile(profilesDir, profile);
    return;
  }

  if (selected === "extensions") {
    ui.log.info("Current extensions:");
    if (profile.extensions?.length) {
      profile.extensions.forEach((e, i) => ui.log.message(`  ${i + 1}. ${e}`));
    } else {
      ui.log.message("  (empty)");
    }

    const action = await selectWithBack<"add" | "clear">({
      message: "extension actions",
      options: [
        { value: "add", label: "add one", hint: "append a new extension" },
        { value: "clear", label: "clear all", hint: "remove every extension" },
      ],
    });

    if (!action || action === BACK_VALUE) {
      await editProfile(profilesDir, profile);
      return;
    }

    if (action === "add") {
      const ext = await ui.text("New extension");
      if (ext) {
        profile.extensions = [...(profile.extensions || []), ext];
        await writeProfileFile(filePath, profile);
        ui.log.success("Added");
      }
    }

    if (action === "clear") {
      profile.extensions = [];
      await writeProfileFile(filePath, profile);
      ui.log.success("Cleared");
    }

    await editProfile(profilesDir, profile);
    return;
  }
}
