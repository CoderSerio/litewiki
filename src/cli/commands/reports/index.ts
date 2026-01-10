import fs from "node:fs/promises";
import { createConfigStore } from "../../../config/store.js";
import { findGitRoot, getGitRemoteOriginUrl } from "../../../utils/git.js";
import {
  computeRepoKey,
  ensureDir as ensureArchiveDir,
  listRuns,
} from "../../../persist/archive.js";
import * as ui from "../../ui.js";
import path from "node:path";
import { serveReportOnce } from "../../../view/server.js";
import {
  relativePath,
  shortHash,
  shortenMiddle,
} from "../../../utils/format.js";

export type ReportsAction = "list" | "open" | "view" | "cat";

function formatTime(iso: string) {
  // YYYY-MM-DD HH:mm
  const s = String(iso || "");
  return s ? s.replace("T", " ").replace("Z", "").slice(0, 16) : "";
}

function formatProject(meta: {
  repoRoot?: string;
  targetPath: string;
  repoKey: string;
}) {
  const project = path.basename(meta.repoRoot || meta.targetPath || "");
  const h6 = shortHash(meta.repoKey, 6);
  return project ? `${project}(${h6})` : `(${h6})`;
}

function formatRun(runId: string) {
  // runId: 2026-..._3cc751 -> 3cc751
  const tail = runId.split("_").slice(-1)[0] || runId;
  return shortHash(tail, 6);
}

async function resolveTargetDir(raw?: string) {
  const p = raw && raw.trim().length > 0 ? raw : process.cwd();
  const abs = path.resolve(process.cwd(), p);
  const st = await fs.stat(abs);
  if (!st.isDirectory()) throw new Error(`不是目录: ${abs}`);
  return abs;
}

export async function reportsCmd(props: {
  action?: ReportsAction;
  dir?: string;
  limit?: number;
  intro?: boolean;
}) {
  if (props.intro !== false) ui.intro("litewiki");

  const store = createConfigStore();
  const conf = store.readAll();
  await ensureArchiveDir(conf.archivesDir);

  const normalizedAction: ReportsAction | undefined =
    props.action === "open" ? "view" : props.action;

  const act =
    normalizedAction ||
    (await ui.select<ReportsAction>({
      message: "reports",
      options: [
        { value: "list", label: "list", hint: "列出归档记录" },
        { value: "view", label: "view", hint: "用浏览器展示（本地临时服务）" },
        { value: "cat", label: "cat", hint: "输出 report.md 到 stdout" },
      ],
      initialValue: "list",
    }));
  if (!act) return;

  let repoKey: string | undefined = undefined;
  if (props.dir) {
    const targetDir = await resolveTargetDir(props.dir);
    const repoRoot = await findGitRoot(targetDir);
    const remote = repoRoot ? await getGitRemoteOriginUrl(repoRoot) : null;
    repoKey = await computeRepoKey({ targetDir, repoRoot, remote });
  }

  const limit = Number.isFinite(props.limit as any)
    ? (props.limit as number)
    : 20;
  const runs = (await listRuns(conf.archivesDir, repoKey)).slice(0, limit);
  if (runs.length === 0) {
    ui.outro("没有找到任何已归档报告");
    return;
  }

  const options = runs.map((r) => {
    const meta: { repoRoot?: string; targetPath: string; repoKey: string } = {
      targetPath: r.meta.targetPath,
      repoKey: r.meta.repoKey,
    };
    if (r.meta.repoRoot !== undefined) meta.repoRoot = r.meta.repoRoot;

    const name = formatProject(meta);
    const run = formatRun(r.meta.runId);
    const time = formatTime(r.meta.createdAt);
    return {
      value: r.reportPath,
      label: `${name}  run:${run}  ${time}`,
      hint: shortenMiddle(relativePath(conf.archivesDir, r.reportPath), 90),
    };
  });

  const chosen = await ui.select<string>({
    message:
      act === "view"
        ? "选择一个进行预览"
        : act === "cat"
        ? "选择一个输出到终端"
        : "选择一个查看",
    options,
  });
  if (!chosen) return;

  if (act === "list") {
    const picked = options.find((o) => o.value === chosen);
    ui.outro(picked ? picked.label : "已选择");
    return;
  }

  if (act === "cat") {
    const txt = await fs.readFile(chosen, "utf-8");
    process.stdout.write(txt);
    return;
  }

  // view：统一走浏览器；不自动调用系统 open（避免平台差异/权限问题）
  const server = await serveReportOnce({
    reportPath: chosen,
    title: "litewiki report",
  });
  ui.outro(`浏览器打开：${server.url}\n按 Ctrl+C 退出预览`);

  const cleanup = () => {
    server.close();
    process.exit(0);
  };
  process.once("SIGINT", cleanup);
  process.once("SIGTERM", cleanup);

  // keep alive
  await new Promise(() => {});
}

export function registerReportsCommand(cli: any) {
  cli
    .command(
      "reports [action] [dir]",
      "查看已生成报告（list/view/cat，open 兼容）"
    )
    .option("--limit <n>", "list 限制条数", { default: "20" })
    .action(
      async (
        action?: ReportsAction,
        dir?: string,
        options?: { limit?: string }
      ) => {
        const limit = Number(options?.limit || "20");
        const args: {
          action?: ReportsAction;
          dir?: string;
          limit?: number;
          intro?: boolean;
        } = { intro: true };
        if (action !== undefined) args.action = action;
        if (dir !== undefined) args.dir = dir;
        args.limit = Number.isFinite(limit) ? limit : 20;

        await reportsCmd(args);
      }
    );
}
