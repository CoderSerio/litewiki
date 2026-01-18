import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  listProfiles,
  writeProfileFile,
} from "../../src/cli/commands/profile/utils.js";
import { DEFAULT_PROFILE, type PromptProfile } from "../../src/cli/commands/profile/constant.js";

test("listProfiles returns builtin default plus saved profiles", async (t) => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "litewiki-profiles-"));
  const profilesDir = path.join(tmpRoot, "profiles");
  await fs.mkdir(profilesDir, { recursive: true });
  t.after(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  const customProfile: PromptProfile = {
    ...DEFAULT_PROFILE,
    id: "custom",
    systemPrompt: "Custom prompt",
    version: 2,
    extensions: ["note"],
  };
  await writeProfileFile(path.join(profilesDir, "custom.json"), customProfile);

  const profiles = await listProfiles(profilesDir);
  assert.equal(profiles.length, 2);
  const builtin = profiles.find((p) => p.id === "default");
  assert(builtin, "expected builtin default profile");
  assert.equal(builtin?.source, "builtin");
  const custom = profiles.find((p) => p.id === "custom");
  assert(custom, "expected custom profile");
  assert.equal(custom?.source, "file");
  assert.equal(custom?.systemPrompt, "Custom prompt");
});

test("profile files override builtin defaults when ids match", async (t) => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "litewiki-profiles-override-"));
  const profilesDir = path.join(tmpRoot, "profiles");
  await fs.mkdir(profilesDir, { recursive: true });
  t.after(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  const overrideProfile: PromptProfile = {
    ...DEFAULT_PROFILE,
    systemPrompt: "File version",
    version: DEFAULT_PROFILE.version + 1,
  };
  await writeProfileFile(path.join(profilesDir, "default.json"), overrideProfile);

  const profiles = await listProfiles(profilesDir);
  const overridden = profiles.find((p) => p.id === "default");
  assert(overridden, "expected overridden default profile");
  // user intent: when id matches builtin default, keep source as builtin even if loaded from file
  assert.equal(overridden?.source, "builtin");
  assert(overridden?.filePath, "expected filePath to be set for overridden builtin");
  assert.equal(overridden?.systemPrompt, "File version");
  assert.equal(overridden?.version, DEFAULT_PROFILE.version + 1);
});
