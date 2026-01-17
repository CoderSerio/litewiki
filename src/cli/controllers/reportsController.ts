import fs from "node:fs/promises";
import path from "node:path";
import { createConfigStore } from "../../config/store.js";
import { ensureDir } from "../../utils/fs.js";
import { listRuns } from "../../utils/archive.js";
import { computeRepoKey, findGitRoot, getGitRemoteOriginUrl } from "../../utils/git.js";
import { relativePath, shortHash, shortenMiddle } from "../../utils/format.js";
import { serveReportOnce } from "../../view/server.js";
import { selectWithBack, BACK_VALUE, ui } from "../core/ui.js";
import { maybeDeleteBrokenPath } from "../common-steps/fileOps.js";

export type ReportsAction = "view" | "cat";

function formatTime(iso: string) {
  const s = String(iso || "");
  return s ? s.replace("T", " ").replace("Z", "").slice(0, 16) : "";
}

function formatProject(meta: { repoRoot?: string; targetPath: string; repoKey: string }) {
  const project = path.basename(meta.repoRoot || meta.targetPath || "");
  const h6 = shortHash(meta.repoKey, 6);
  return project ? `${project}(${h6})` : `(${h6})`;
}

function formatRun(runId: string) {
  const tail = runId.split("_").slice(-1)[0] || runId;
  return shortHash(tail, 6);
}

async function resolveTargetDir(raw?: string) {
  const p = raw && raw.trim().length > 0 ? raw : process.cwd();
  const abs = path.resolve(process.cwd(), p);
  const st = await fs.stat(abs);
  if (!st.isDirectory()) throw new Error(`Not a directory: ${abs}`);
  return abs;
}

export async function reportsController(props: { action?: ReportsAction; dir?: string; limit?: number; intro?: boolean }) {
  if (props.intro !== false) ui.intro("litewiki");
  const store = createConfigStore();
  const conf = store.readAll();
  await ensureDir(conf.archivesDir);

  let act = props.action;
  if (!act) {
    const scopeHint = props.dir ? "Scope: current project" : "Scope: all projects";
    const a = await selectWithBack<ReportsAction>({
      message: "Reports",
      options: [
        { value: "view", label: "view", hint: `Open in browser - local server; ${scopeHint}` },
        // { value: "cat", label: "cat", hint: "输出 report.md 到 stdout" },
      ],
      initialValue: "view",
    });
    if (!a || a === BACK_VALUE) return;
    act = a;
  }

  let repoKey: string | undefined = undefined;
  if (props.dir) {
    const targetDir = await resolveTargetDir(props.dir);
    const repoRoot = await findGitRoot(targetDir);
    const remote = repoRoot ? await getGitRemoteOriginUrl(repoRoot) : null;
    repoKey = await computeRepoKey({ targetDir, repoRoot, remote });
  }

  const limit = Number.isFinite(props.limit as any) ? (props.limit as number) : 20;
  async function findBrokenRunDirs(archivesDir: string, repoKey?: string): Promise<{ dir: string; metaPath: string; reportPath: string }[]> {
    const broken: { dir: string; metaPath: string; reportPath: string }[] = [];
    async function scanUnder(dir: string) {
      const items = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const it of items) {
        if (!it.isDirectory()) continue;
        const runDirPath = path.join(dir, it.name);
        const metaPath = path.join(runDirPath, "meta.json");
        const reportPath = path.join(runDirPath, "report.md");
        try {
          const raw = await fs.readFile(metaPath, "utf-8");
          const meta = JSON.parse(raw);
          // minimal validity: must have runId
          if (!meta || typeof meta.runId !== "string") throw new Error("invalid meta");
          // treat missing report.md as broken as well
          await fs.stat(reportPath);
        } catch {
          broken.push({ dir: runDirPath, metaPath, reportPath });
        }
      }
    }
    if (repoKey) await scanUnder(path.join(archivesDir, repoKey));
    else {
      const repos = await fs.readdir(archivesDir, { withFileTypes: true }).catch(() => []);
      for (const r of repos) if (r.isDirectory()) await scanUnder(path.join(archivesDir, r.name));
    }
    return broken;
  }

  const runs = (await listRuns(conf.archivesDir, repoKey)).slice(0, limit);
  const broken = await findBrokenRunDirs(conf.archivesDir, repoKey);
  if (runs.length === 0 && broken.length === 0) {
    ui.outro("No archived reports found");
    return;
  }

  while (true) {
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

    // append broken entries
    for (const b of broken) {
      options.push({
        value: `broken::${b.dir}`,
        label: `[broken] ${shortenMiddle(relativePath(conf.archivesDir, b.dir), 70)}`,
        hint: `meta: ${shortenMiddle(relativePath(conf.archivesDir, b.metaPath), 60)}`,
      });
    }

    const chosen = await selectWithBack<string>({
      message: act === "view" ? "Pick one to preview" : act === "cat" ? "Pick one to print to stdout" : "Pick one to view",
      options,
    });
    if (!chosen || chosen === BACK_VALUE) return; // back to caller

    if (chosen.startsWith("broken::")) {
      const dir = chosen.slice("broken::".length);
      const ok = await maybeDeleteBrokenPath({ targetPath: dir, isDir: true, reason: "Invalid meta.json or missing report.md" });
      if (ok) {
        // refresh lists
        return await reportsController({ ...props, intro: false });
      }
      // stay in loop to let user pick again
      continue;
    }

    if (act === "cat") {
      const txt = await fs.readFile(chosen, "utf-8");
      process.stdout.write(txt);
      return;
    }

    const server = await serveReportOnce({ reportPath: chosen, title: "litewiki report" });
    ui.outro(`Opened in browser: ${server.url}\nPress Ctrl+C to exit preview`);
    const cleanup = () => {
      server.close();
      process.exit(0);
    };
    process.once("SIGINT", cleanup);
    process.once("SIGTERM", cleanup);
    await new Promise(() => {});
  }
}
