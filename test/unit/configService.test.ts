import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  deleteConfig,
  getActiveConfigId,
  listConfigs,
  migrateLegacyConfigIfNeeded,
  saveConfig,
} from "../../src/services/configService.js";

test("config service can persist, list, and delete configs", async (t) => {
  const tmpRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "litewiki-config-test-"),
  );
  const configDir = path.join(tmpRoot, "configs");
  await fs.mkdir(configDir, { recursive: true });
  t.after(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  await saveConfig(configDir, {
    id: "alpha",
    provider: "mock",
    model: "a",
    key: "secret-a",
    baseUrl: "https://example.com/a",
  });
  await saveConfig(configDir, {
    id: "beta",
    provider: "mock",
    model: "b",
    key: "secret-b",
    baseUrl: "https://example.com",
  });

  const listed = await listConfigs(configDir);
  assert.equal(listed.length, 2);
  assert.deepEqual(
    listed.map((c) => c.id),
    ["alpha", "beta"].sort(),
  );
  const beta = listed.find((c) => c.id === "beta");
  assert.equal(beta?.baseUrl, "https://example.com");

  await deleteConfig(configDir, "alpha");
  const afterDelete = await listConfigs(configDir);
  assert.equal(afterDelete.length, 1);
  assert.equal(afterDelete[0]?.id, "beta");
});

test(
  "legacy config migration imports config.json and marks default active",
  { concurrency: false },
  async (t) => {
    const tmpRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "litewiki-config-migrate-"),
    );
    const configDir = path.join(tmpRoot, "configs");
    const homeDir = path.join(tmpRoot, "home");
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(
      path.join(configDir, "config.json"),
      JSON.stringify({
        provider: "provider-x",
        model: "model-x",
        key: "key-x",
        baseUrl: "https://api",
      }),
    );

    const prevHome = process.env.LITEWIKI_HOME;
    process.env.LITEWIKI_HOME = homeDir;
    t.after(async () => {
      if (prevHome === undefined) process.env.LITEWIKI_HOME = undefined;
      else process.env.LITEWIKI_HOME = prevHome;
      await fs.rm(tmpRoot, { recursive: true, force: true });
    });

    await migrateLegacyConfigIfNeeded(configDir);
    const configs = await listConfigs(configDir);
    assert.equal(configs.length, 1);
    const cfg = configs[0];
    assert(cfg);
    assert.equal(cfg.id, "default");
    assert.equal(cfg.provider, "provider-x");
    assert.equal(cfg.model, "model-x");
    assert.equal(cfg.key, "key-x");
    assert.equal(cfg.baseUrl, "https://api");
    assert.equal(getActiveConfigId(), "default");
  },
);
