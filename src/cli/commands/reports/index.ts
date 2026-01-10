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

export type ReportsAction = "list" | "open" | "view" | "cat";

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

  if (act === "list") {
    ui.outro(
      runs
        .map(
          (r) =>
            `${r.meta.createdAt}\t${r.meta.mode}\t${r.meta.profileId}\t${r.reportPath}`
        )
        .join("\n")
    );
    return;
  }

  const chosen = await ui.select<string>({
    message: "选择一个 run",
    options: runs.map((r) => ({
      value: r.reportPath,
      label: `${r.meta.createdAt} ${r.meta.mode} ${r.meta.profileId}`,
      hint: r.reportPath,
    })),
  });
  if (!chosen) return;

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
        await reportsCmd({
          action,
          dir,
          limit: Number.isFinite(limit) ? limit : 20,
          intro: true,
        });
      }
    );
}
