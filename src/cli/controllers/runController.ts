import path from "node:path";
import { runDeepWikiAgent } from "../../agent/providers/index.js";
import { createConfigStore } from "../../config/store.js";
import { normalizeMarkdown } from "../../utils/agent.js";
import * as arch from "../../utils/archive.js";
import { ensureDir } from "../../utils/fs.js";
import {
  computeRepoKey,
  findGitRoot,
  getGitHeadShort,
  getGitRemoteOriginUrl,
  getGitStatusDirty,
} from "../../utils/git.js";
import {
  type AiConfigLike,
  ensureAiConfig,
} from "../common-steps/ensureAiConfig.js";
import { pickDirectory } from "../common-steps/pickDirectory.js";
import { pickProfileId } from "../common-steps/pickProfile.js";
import { pickRunMode } from "../common-steps/pickRunMode.js";
import { back, exit, next, runFlow } from "../core/flow.js";
import { ui } from "../core/ui.js";
import { BACK_VALUE, selectWithBack } from "../core/ui.js";

type RunCtx = {
  dirArg: string | undefined;
  profileArg: string | undefined;
  // gathered
  targetDir?: string;
  repoRoot?: string | null;
  head?: string | null;
  dirty?: boolean | null;
  remote?: string | null;
  repoKey?: string;
  profileId?: string;
  aiConfig?: AiConfigLike;
  mode?: "fresh" | "incremental";
  priorReport?: string | null;
};

export async function runController(props: {
  dirArg?: string;
  profile?: string;
  intro?: boolean;
}) {
  if (props.intro !== false) ui.intro("litewiki");

  const store = createConfigStore();
  const conf = store.readAll();
  await ensureDir(conf.archivesDir);

  const ctx: RunCtx = { dirArg: props.dirArg, profileArg: props.profile };

  const steps = [
    // 0. resolve dir & git info
    async () => {
      const targetDir = await pickDirectory(ctx.dirArg);
      if (!targetDir) return exit();
      ctx.targetDir = targetDir;
      ctx.repoRoot = await findGitRoot(targetDir);
      const [head, dirty, remote] = ctx.repoRoot
        ? await Promise.all([
            getGitHeadShort(ctx.repoRoot),
            getGitStatusDirty(ctx.repoRoot),
            getGitRemoteOriginUrl(ctx.repoRoot),
          ])
        : [null, null, null];
      ctx.head = head;
      ctx.dirty = dirty;
      ctx.remote = remote;
      ctx.repoKey = await computeRepoKey({
        targetDir,
        repoRoot: ctx.repoRoot,
        remote,
      });
      return next();
    },
    // 1. confirm
    async () => {
      if (!ctx.repoRoot || !ctx.targetDir) return next();
      const descParts = [
        `Target: ${ctx.targetDir}`,
        `Git repo: ${ctx.repoRoot}`,
        ctx.head ? `HEAD: ${ctx.head}` : null,
        ctx.dirty == null
          ? null
          : ctx.dirty
            ? `Status: dirty`
            : `Status: clean`,
        ctx.remote ? `Remote: ${ctx.remote}` : null,
      ].filter(Boolean);
      const ok = await ui.confirm(`${descParts.join("\n")}\n\nProceed?`, false);
      return ok ? next() : exit();
    },
    // 2. pick profile (with back)
    async () => {
      const id = await pickProfileId(ctx.profileArg);
      if (!id) return back();
      ctx.profileId = id;
      return next();
    },
    // 3. ensure ai config (with back)
    async () => {
      const cfg = await ensureAiConfig();
      if (!cfg) return back();
      ctx.aiConfig = cfg;
      return next();
    },
    // 4. pick mode (with back)
    async () => {
      const m = await pickRunMode();
      if (!m) return back();
      ctx.mode = m;
      return next();
    },
    // 5. prepare prior report if needed
    async () => {
      if (ctx.mode !== "incremental") return next();
      if (!ctx.targetDir || !ctx.repoKey) {
        throw new Error("Internal error: missing targetDir/repoKey");
      }
      const targetDir = ctx.targetDir;
      const repoKey = ctx.repoKey;

      const projectId = await arch.findProjectIdByTargetPath(
        conf.archivesDir,
        targetDir,
      );
      const prior = projectId
        ? await arch.readLatestReport(conf.archivesDir, projectId)
        : await arch.readLegacyLatestReport(conf.archivesDir, repoKey);
      if (!prior) {
        const ok = await ui.confirm(
          "No previous report found. Switch to fresh?",
          true,
        );
        if (!ok) return back();
        ctx.priorReport = null;
        ctx.mode = "fresh";
        return next();
      }
      ctx.priorReport = prior;
      return next();
    },
    // 6. run
    async () => {
      if (
        !ctx.targetDir ||
        !ctx.profileId ||
        !ctx.aiConfig ||
        !ctx.mode ||
        !ctx.repoKey
      ) {
        throw new Error("Internal error: missing required context");
      }
      const targetDir = ctx.targetDir;
      const profileId = ctx.profileId;
      const aiConfig = ctx.aiConfig;
      const mode = ctx.mode;
      const repoKey = ctx.repoKey;

      const spin = ui.spinner("Running agent...");
      try {
        const prof = await (
          await import("../commands/profile/utils.js")
        ).getProfileById(conf.profilesDir, profileId);
        const { DEFAULT_PROFILE } = await import(
          "../commands/profile/constant.js"
        );
        const systemPrompt =
          prof?.systemPrompt || (DEFAULT_PROFILE as any).systemPrompt;
        const extensions = (prof?.extensions ??
          (DEFAULT_PROFILE as any).extensions ??
          []) as string[];

        const agentOpts: any = { systemPrompt, extensions };
        if (ctx.priorReport && ctx.priorReport.trim())
          agentOpts.priorReport = ctx.priorReport;
        agentOpts.provider = aiConfig.provider;
        if (aiConfig.key) agentOpts.apiKey = aiConfig.key;
        if (aiConfig.baseUrl) agentOpts.baseUrl = aiConfig.baseUrl;
        if (aiConfig.model) agentOpts.model = aiConfig.model;

        const report = await runDeepWikiAgent(targetDir, agentOpts);
        spin.stop("Done");

        const reportMd = normalizeMarkdown(report);
        const runId = arch.createRunId();
        const info = await arch.writeRun({
          archivesDir: conf.archivesDir,
          runId,
          meta: {
            createdAt: new Date().toISOString(),
            repoKey,
            runId,
            mode,
            profileId,
            targetPath: targetDir,
            isGitRepo: Boolean(ctx.repoRoot),
            ...(ctx.repoRoot ? { repoRoot: ctx.repoRoot } : {}),
            ...(ctx.head ? { head: ctx.head } : {}),
            ...(ctx.dirty == null ? {} : { dirty: ctx.dirty }),
            ...(ctx.remote ? { remote: ctx.remote } : {}),
          },
          reportMarkdown: reportMd,
        });

        ui.outro(`Archived to: ${info.reportPath}\n\n${reportMd}`);
        return exit();
      } catch (e) {
        spin.stop("Failed");
        ui.outro(String(e));
        process.exitCode = 1;
        return exit();
      }
    },
  ];

  await runFlow(steps as any, ctx, 0);
}
