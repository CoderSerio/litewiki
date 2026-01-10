import path from "node:path";
import fs from "node:fs/promises";
import {
  findGitRoot,
  getGitHeadShort,
  getGitRemoteOriginUrl,
  getGitStatusDirty,
} from "../../../utils/git.js";
import { runDeepWikiAgent } from "../../../agent/provider.js";
import { createConfigStore } from "../../../config/store.js";
import { defaultProfile } from "../../../prompts/defaultProfile.js";
import {
  ensureDir,
  getProfileById,
  listProfiles,
} from "../../../prompts/profiles.js";
import { normalizeMarkdown } from "../../../output/markdown.js";
import {
  computeRepoKey,
  createRunId,
  ensureDir as ensureArchiveDir,
  readLatestReport,
  writeRun,
} from "../../../persist/archive.js";
import * as ui from "../../ui.js";

export type RunMode = "fresh" | "incremental";

async function resolveTargetDir(raw?: string) {
  const p = raw && raw.trim().length > 0 ? raw : process.cwd();
  const abs = path.resolve(process.cwd(), p);
  const st = await fs.stat(abs);
  if (!st.isDirectory()) throw new Error(`不是目录: ${abs}`);
  return abs;
}

async function pickProfileId(props: {
  profilesDir: string;
  defaultProfileId: string;
  lastProfileId?: string;
  forcedId?: string;
}) {
  const { profilesDir, defaultProfileId, lastProfileId, forcedId } = props;
  await ensureDir(profilesDir);

  if (forcedId) {
    const prof = await getProfileById(profilesDir, forcedId);
    if (!prof) throw new Error(`找不到 profile: ${forcedId}`);
    return prof.id;
  }

  const profiles = await listProfiles(profilesDir);
  const initial = (lastProfileId ||
    defaultProfileId ||
    defaultProfile.id) as string;
  const chosen = await ui.select<string>({
    message: "Prompt Profile",
    options: profiles.map((p) => ({
      value: p.id,
      label: p.id,
      hint: p.source === "builtin" ? "builtin" : "file",
    })),
    initialValue: initial,
  });
  if (!chosen) return null;
  return chosen;
}

export async function runCmd(props: {
  dirArg?: string;
  profile?: string;
  intro?: boolean;
}) {
  if (props.intro !== false) ui.intro("litewiki");

  const store = createConfigStore();
  const conf = store.readAll();
  await ensureArchiveDir(conf.archivesDir);

  let targetDir: string;
  try {
    targetDir = await resolveTargetDir(props.dirArg);
  } catch (e) {
    ui.outro(String(e));
    process.exitCode = 1;
    return;
  }

  const repoRoot = await findGitRoot(targetDir);
  const gitInfo = repoRoot
    ? await Promise.all([
        getGitHeadShort(repoRoot),
        getGitStatusDirty(repoRoot),
        getGitRemoteOriginUrl(repoRoot),
      ])
    : [null, null, null];
  const head = gitInfo[0];
  const dirty = gitInfo[1];
  const remote = gitInfo[2];

  const repoKey = await computeRepoKey({ targetDir, repoRoot, remote });

  if (repoRoot) {
    const descParts = [
      `目标: ${targetDir}`,
      `Git: ${repoRoot}`,
      head ? `HEAD: ${head}` : null,
      dirty == null ? null : dirty ? `状态: 有未提交变更` : `状态: 干净`,
      remote ? `remote: ${remote}` : null,
    ].filter(Boolean);
    const ok = await ui.confirm(`${descParts.join("\n")}\n\n继续分析？`, false);
    if (!ok) return;
  }

  let profileId: string | null = null;
  try {
    const pickArgs: {
      profilesDir: string;
      defaultProfileId: string;
      lastProfileId?: string;
      forcedId?: string;
    } = {
      profilesDir: conf.profilesDir,
      defaultProfileId: conf.defaultProfileId,
    };
    if (conf.lastProfileId !== undefined)
      pickArgs.lastProfileId = conf.lastProfileId;
    if (props.profile !== undefined) pickArgs.forcedId = props.profile;
    profileId = await pickProfileId(pickArgs);
  } catch (e) {
    ui.outro(String(e));
    process.exitCode = 1;
    return;
  }
  if (!profileId) return;
  store.write("lastProfileId", profileId);

  const mode = await ui.select<RunMode>({
    message: "生成模式",
    options: [
      { value: "fresh", label: "fresh", hint: "从零生成" },
      {
        value: "incremental",
        label: "incremental",
        hint: "基于上次结果增量更新",
      },
    ],
    initialValue: "fresh",
  });
  if (!mode) return;

  let priorReport: string | null = null;
  if (mode === "incremental") {
    priorReport = await readLatestReport(conf.archivesDir, repoKey);
    if (!priorReport) {
      const ok = await ui.confirm("未找到上次报告，改用 fresh？", true);
      if (!ok) return;
      priorReport = null;
    }
  }

  const spin = ui.spinner("运行 agent...");
  try {
    const prof = await getProfileById(conf.profilesDir, profileId);
    const systemPrompt = prof?.systemPrompt || defaultProfile.systemPrompt;
    const extensions = prof?.extensions ?? defaultProfile.extensions ?? [];
    const agentOpts: { systemPrompt?: string; extensions?: string[] } = {
      systemPrompt,
    };
    if (extensions.length > 0) agentOpts.extensions = extensions;
    if (priorReport && priorReport.trim())
      (agentOpts as any).priorReport = priorReport;

    const report = await runDeepWikiAgent(targetDir, agentOpts as any);
    spin.stop("完成");

    const reportMd = normalizeMarkdown(report);
    const runId = createRunId();
    await writeRun({
      archivesDir: conf.archivesDir,
      repoKey,
      runId,
      meta: {
        createdAt: new Date().toISOString(),
        repoKey,
        runId,
        mode,
        profileId,
        targetPath: targetDir,
        isGitRepo: Boolean(repoRoot),
        ...(repoRoot ? { repoRoot } : {}),
        ...(head ? { head } : {}),
        ...(dirty == null ? {} : { dirty }),
        ...(remote ? { remote } : {}),
      },
      reportMarkdown: reportMd,
    });

    ui.outro(
      `已归档: ${path.join(
        conf.archivesDir,
        repoKey,
        runId,
        "report.md"
      )}\n\n${reportMd}`
    );
  } catch (e) {
    spin.stop("失败");
    ui.outro(String(e));
    process.exitCode = 1;
  }
}

export function registerRunCommand(cli: any) {
  cli
    .command("run [dir]", "分析目录（默认当前目录）")
    .option("--profile <id>", "选择 prompt profile（跳过交互选择）")
    .action(async (dir?: string, options?: { profile?: string }) => {
      if (options?.profile !== undefined) {
        await runCmd({ dirArg: dir, profile: options.profile, intro: true });
        return;
      }
      await runCmd({ dirArg: dir, intro: true });
    });

  cli
    .command("show [dir]", "（兼容）旧命令，等价于 run")
    .option("--profile <id>", "选择 prompt profile（跳过交互选择）")
    .action(async (dir?: string, options?: { profile?: string }) => {
      if (options?.profile !== undefined) {
        await runCmd({ dirArg: dir, profile: options.profile, intro: true });
        return;
      }
      await runCmd({ dirArg: dir, intro: true });
    });
}
