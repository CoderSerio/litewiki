import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execa } from "execa";
import { runCmd } from "../../src/cli/commands/run/index.js";
import type { RunDeepWikiAgentOptions } from "../../src/agent/providers/index.js";
import { createTestPrompts, type PromptQueues } from "../helpers/testPrompts.js";

type AgentCall = { cwd: string; opts: RunDeepWikiAgentOptions | undefined };

test(
  "run command (fresh) archives report and writes metadata",
  { concurrency: false },
  async () => {
    const env = await setupIsolatedHome();
    try {
      const repoDir = await createTempRepo(env.tmpRoot);
      const mockReports = ["# Report\\nFresh run\\n"] as const;
      const agent = installMockAgent(mockReports);
      const prompts = installPrompts({
        confirms: [true],
        selects: ["default", "temp", "fresh"],
        texts: ["mock-provider", "mock-model", "mock-key", ""],
      });

      await runCmd({ dirArg: repoDir, intro: false });
      prompts.restore();
      agent.restore();

      const latest = await readLatestRun(env.homeDir);
      assert.equal(agent.calls.length, 1);
      const firstCall = agent.calls[0]!;
      assert.equal(firstCall.cwd, repoDir);
      assert.equal(firstCall.opts?.provider, "mock-provider");
      assert.equal(latest.meta.mode, "fresh");
      assert.equal(latest.meta.profileId, "default");
      assert.equal(latest.meta.targetPath, repoDir);
      const freshReport = mockReports[0]!;
      assert.equal(latest.reportMd.trimEnd(), freshReport.trimEnd());
      assert(latest.reportMd.endsWith("\n"));
      assert(latest.meta.head, "expected git commit hash to be recorded");
      const outroMessage = prompts.logs.outros[0]!;
      assert(outroMessage.includes("Archived to"));
    } finally {
      await env.cleanup();
    }
  }
);

test(
  "run command incremental mode reuses previous report",
  { concurrency: false },
  async () => {
    const env = await setupIsolatedHome();
    try {
      const repoDir = await createTempRepo(env.tmpRoot);
      const mockReports = ["# Report\\nFresh run\\n", "# Report\\nIncremental run\\n"] as const;
      const agent = installMockAgent(mockReports);

      // first run to seed archives
      {
        const prompts = installPrompts({
          confirms: [true],
          selects: ["default", "temp", "fresh"],
          texts: ["mock-provider", "mock-model", "mock-key", ""],
        });
        await runCmd({ dirArg: repoDir, intro: false });
        prompts.restore();
      }
      const firstRun = await readLatestRun(env.homeDir);

      // second run incremental
      const prompts = installPrompts({
        confirms: [true],
        selects: ["default", "temp", "incremental"],
        texts: ["mock-provider", "mock-model", "mock-key", ""],
      });
      await runCmd({ dirArg: repoDir, intro: false });
      prompts.restore();

      assert.equal(agent.calls.length, 2);
      const secondCall = agent.calls[1]!;
      const baseReport = mockReports[0]!;
      assert.equal(secondCall.opts?.priorReport?.trimEnd(), baseReport.trimEnd());
      const secondRun = await readLatestRun(env.homeDir);
      assert.notEqual(secondRun.runId, firstRun.runId);
      assert.equal(secondRun.meta.mode, "incremental");
      const incrementalReport = mockReports[1]!;
      assert.equal(secondRun.reportMd.trimEnd(), incrementalReport.trimEnd());
      assert(secondRun.reportMd.endsWith("\n"));

      const repoPath = path.join(env.homeDir, "runs", secondRun.repoKey);
      const runDirs = (await fs.readdir(repoPath)).filter((name) => name !== "latest.json");
      assert.equal(runDirs.length, 2);
      agent.restore();
    } finally {
      await env.cleanup();
    }
  }
);

async function createTempRepo(tmpRoot: string) {
  const repoDir = path.join(tmpRoot, `repo-${crypto.randomBytes(3).toString("hex")}`);
  await fs.mkdir(repoDir, { recursive: true });
  await fs.writeFile(path.join(repoDir, "README.md"), "# Example\\n");
  await execa("git", ["init"], { cwd: repoDir });
  await execa("git", ["config", "user.email", "test@example.com"], { cwd: repoDir });
  await execa("git", ["config", "user.name", "Test"], { cwd: repoDir });
  await execa("git", ["add", "README.md"], { cwd: repoDir });
  await execa("git", ["commit", "-m", "init"], { cwd: repoDir });
  return repoDir;
}

async function setupIsolatedHome() {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "litewiki-test-"));
  const homeDir = path.join(tmpRoot, "home");
  const prevHome = process.env.LITEWIKI_HOME;
  process.env.LITEWIKI_HOME = homeDir;
  return {
    tmpRoot,
    homeDir,
    cleanup: async () => {
      if (prevHome === undefined) delete process.env.LITEWIKI_HOME;
      else process.env.LITEWIKI_HOME = prevHome;
      const g = globalThis as typeof globalThis & {
        __LITEWIKI_PROMPTS__?: any;
        __LITEWIKI_AGENT__?: any;
      };
      delete g.__LITEWIKI_PROMPTS__;
      delete g.__LITEWIKI_AGENT__;
      await fs.rm(tmpRoot, { recursive: true, force: true });
    },
  };
}

function installMockAgent(reports: readonly string[]) {
  const g = globalThis as typeof globalThis & {
    __LITEWIKI_AGENT__?: (
      cwd: string,
      opts?: RunDeepWikiAgentOptions
    ) => Promise<string>;
  };
  const calls: AgentCall[] = [];
  g.__LITEWIKI_AGENT__ = async (cwd: string, opts?: RunDeepWikiAgentOptions) => {
    calls.push({ cwd, opts });
    const idx = calls.length - 1;
    return reports[idx] ?? "# Report\\n";
  };
  return {
    calls,
    restore() {
      delete g.__LITEWIKI_AGENT__;
    },
  };
}

function installPrompts(queues: PromptQueues) {
  const helper = createTestPrompts(queues);
  const g = globalThis as typeof globalThis & { __LITEWIKI_PROMPTS__?: typeof helper.prompts };
  g.__LITEWIKI_PROMPTS__ = helper.prompts;
  return {
    ...helper,
    restore() {
      delete g.__LITEWIKI_PROMPTS__;
    },
  };
}

async function readLatestRun(homeDir: string) {
  const runsRoot = path.join(homeDir, "runs");
  const repos = await fs.readdir(runsRoot);
  const [repoKey] = repos;
  if (!repoKey) throw new Error("No runs recorded");
  const repoPath = path.join(runsRoot, repoKey);
  const latestPath = path.join(repoPath, "latest.json");
  const latest = JSON.parse(await fs.readFile(latestPath, "utf8"));
  const runId = typeof latest.runId === "string" ? latest.runId : null;
  if (!runId) throw new Error("latest.json missing runId");
  const runDir = path.join(repoPath, runId);
  const meta = JSON.parse(await fs.readFile(path.join(runDir, "meta.json"), "utf8"));
  const reportMd = await fs.readFile(path.join(runDir, "report.md"), "utf8");
  return { repoKey, latestPath, runDir, runId, meta, reportMd };
}
