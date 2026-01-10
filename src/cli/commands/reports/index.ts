import fs from "node:fs/promises";
import { execaCommand } from "execa";
import { createConfigStore } from "../../../config/store.js";
import { findGitRoot, getGitRemoteOriginUrl } from "../../../utils/git.js";
import {
  computeRepoKey,
  ensureDir as ensureArchiveDir,
  listRuns,
} from "../../../persist/archive.js";
import * as ui from "../../ui.js";
import path from "node:path";

export type ReportsAction = "list" | "open" | "cat";

async function resolveTargetDir(raw?: string) {
  const p = raw && raw.trim().length > 0 ? raw : process.cwd();
  const abs = path.resolve(process.cwd(), p);
  const st = await fs.stat(abs);
  if (!st.isDirectory()) throw new Error(`不是目录: ${abs}`);
  return abs;
}

async function openWithDefaultApp(filePath: string) {
  if (process.platform === "darwin") {
    await execaCommand(`open ${JSON.stringify(filePath)}`, {
      shell: true,
      stdio: "inherit",
    });
    return;
  }
  await execaCommand(`xdg-open ${JSON.stringify(filePath)}`, {
    shell: true,
    stdio: "inherit",
  });
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

  const act =
    props.action ||
    (await ui.select<ReportsAction>({
      message: "reports",
      options: [
        { value: "list", label: "list", hint: "列出归档记录" },
        { value: "open", label: "open", hint: "用系统默认程序打开 report.md" },
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

  await openWithDefaultApp(chosen);
}

export function registerReportsCommand(cli: any) {
  cli
    .command("reports [action] [dir]", "查看已生成报告（list/open/cat）")
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
