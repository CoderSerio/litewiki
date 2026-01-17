import fs from "node:fs/promises";
import path from "node:path";
import { createConfigStore } from "../../config/store.js";
import { ensureDir } from "../../utils/fs.js";
import { listRuns, readLatestRunId, writeLatestRunId } from "../../utils/archive.js";
import { relativePath, shortHash, shortenMiddle } from "../../utils/format.js";
import { serveReportOnce } from "../../view/server.js";
import { selectWithBack, BACK_VALUE, ui } from "../core/ui.js";
import { maybeDeleteBrokenPath } from "../common-steps/fileOps.js";

export type ReportsAction = "view" | "delete";

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
  const limit = Number.isFinite(props.limit as any) ? (props.limit as number) : 20;
  const currentDir = await resolveTargetDir(props.dir).catch(() => process.cwd());

  async function findBrokenRunDirs(targetDir: string): Promise<{ dir: string; metaPath: string; reportPath: string }[]> {
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
    await scanUnder(targetDir);
    return broken;
  }

  const runs = await listRuns(conf.archivesDir);
  if (runs.length === 0) {
    ui.outro("No archived reports found");
    return;
  }

  while (true) {
    const projectsByTarget = new Map<
      string,
      { targetPath: string; runs: typeof runs; projectDirs: Set<string>; latestAt?: string; displayId?: string }
    >();
    for (const r of runs) {
      const key = r.meta.targetPath || "";
      const existing = projectsByTarget.get(key);
      if (!existing) {
        projectsByTarget.set(key, {
          targetPath: key,
          runs: [r],
          projectDirs: new Set([path.dirname(r.dir)]),
          latestAt: r.meta.createdAt,
        });
      } else {
        existing.runs.push(r);
        existing.projectDirs.add(path.dirname(r.dir));
        if (!existing.latestAt || existing.latestAt < r.meta.createdAt) existing.latestAt = r.meta.createdAt;
      }
    }

    const projectList = Array.from(projectsByTarget.values());
    const nameCounts = new Map<string, number>();
    for (const p of projectList) {
      const base = path.basename(p.targetPath || "") || "project";
      nameCounts.set(base, (nameCounts.get(base) || 0) + 1);
    }
    for (const p of projectList) {
      const base = path.basename(p.targetPath || "") || "project";
      p.displayId =
        (nameCounts.get(base) || 0) > 1 ? `${base}-${shortHash(p.targetPath, 6)}` : base;
    }

    const current = projectList.find((p) => path.resolve(p.targetPath) === path.resolve(currentDir));
    projectList.sort((a, b) => {
      if (current && a.targetPath === current.targetPath) return -1;
      if (current && b.targetPath === current.targetPath) return 1;
      return (b.latestAt || "").localeCompare(a.latestAt || "");
    });

    const projectOptions = projectList.map((p) => ({
      value: p.targetPath,
      label: p.displayId || p.targetPath,
      hint:
        current && p.targetPath === current.targetPath
          ? `current; ${shortenMiddle(p.targetPath, 80)}`
          : shortenMiddle(p.targetPath, 80),
    }));

    const chosenProject = await selectWithBack<string>({
      message: "Reports",
      options: projectOptions,
    });
    if (!chosenProject || chosenProject === BACK_VALUE) return;
    const proj = projectsByTarget.get(chosenProject);
    if (!proj) continue;

    const action = await selectWithBack<ReportsAction>({
      message: `${proj.displayId || proj.targetPath}`,
      options: [
        { value: "view", label: "view", hint: "Open in browser - local server" },
        { value: "delete", label: "delete" },
      ],
    });
    if (!action || action === BACK_VALUE) continue;

    if (action === "delete") {
      const del = await selectWithBack<"all" | "history">({
        message: "Delete reports",
        options: [
          { value: "all", label: "all", hint: "this project only" },
          { value: "history", label: "history", hint: "this project only" },
        ],
      });
      if (!del || del === BACK_VALUE) continue;
      if (del === "all") {
        for (const r of proj.runs) {
          await fs.rm(r.dir, { recursive: true, force: true });
        }
        for (const dir of proj.projectDirs) {
          const items = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
          const hasRunDirs = items.some((it) => it.isDirectory());
          if (!hasRunDirs) await fs.rm(dir, { recursive: true, force: true });
        }
        ui.log.success("Deleted reports for this project");
        return await reportsController({ ...props, intro: false });
      }
      // delete history: keep latest
      const projectDirs = Array.from(proj.projectDirs);
      const primaryDir = projectDirs.find((d) => d.includes(path.join(conf.archivesDir, "projects")));
      const projectId = primaryDir ? path.basename(primaryDir) : null;
      const latestId = projectId ? await readLatestRunId(conf.archivesDir, projectId) : null;
      const sorted = [...proj.runs].sort((a, b) => (a.meta.createdAt < b.meta.createdAt ? 1 : -1));
      const keep = latestId || sorted[0]?.meta.runId;
      for (const r of proj.runs) {
        if (r.meta.runId === keep) continue;
        await fs.rm(r.dir, { recursive: true, force: true });
      }
      if (projectId && keep) await writeLatestRunId(conf.archivesDir, projectId, keep);
      ui.log.success("Deleted history; kept latest");
      return await reportsController({ ...props, intro: false });
    }

    // view runs
    const primaryDir = Array.from(proj.projectDirs).find((d) =>
      d.includes(path.join(conf.archivesDir, "projects"))
    );
    const broken = await findBrokenRunDirs(primaryDir || Array.from(proj.projectDirs)[0] || conf.archivesDir);
    const runOptions = proj.runs
      .sort((a, b) => (a.meta.createdAt < b.meta.createdAt ? 1 : -1))
      .slice(0, limit)
      .map((r) => {
        const run = formatRun(r.meta.runId);
        const time = formatTime(r.meta.createdAt);
        return {
          value: r.reportPath,
          label: `run:${run}  ${time}`,
          hint: shortenMiddle(relativePath(conf.archivesDir, r.reportPath), 90),
        };
      });
    for (const b of broken) {
      runOptions.push({
        value: `broken::${b.dir}`,
        label: `[broken] ${shortenMiddle(relativePath(conf.archivesDir, b.dir), 70)}`,
        hint: `meta: ${shortenMiddle(relativePath(conf.archivesDir, b.metaPath), 60)}`,
      });
    }
    const chosen = await selectWithBack<string>({
      message: "Pick one to preview",
      options: runOptions,
    });
    if (!chosen || chosen === BACK_VALUE) continue;
    if (chosen.startsWith("broken::")) {
      const dir = chosen.slice("broken::".length);
      const ok = await maybeDeleteBrokenPath({ targetPath: dir, isDir: true, reason: "Invalid meta.json or missing report.md" });
      if (ok) return await reportsController({ ...props, intro: false });
      continue;
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
