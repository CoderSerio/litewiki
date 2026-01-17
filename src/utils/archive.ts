import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { ensureDir } from "./fs.js";
import { shortHash } from "./format.js";

export type RunMeta = {
  createdAt: string; // ISO
  repoKey: string;
  runId: string;
  mode: "fresh" | "incremental";
  profileId: string;

  targetPath: string;
  isGitRepo: boolean;
  repoRoot?: string;
  head?: string;
  dirty?: boolean;
  remote?: string;
  projectId?: string;
  projectName?: string;
};

export type RunInfo = {
  meta: RunMeta;
  dir: string;
  reportPath: string;
  metaPath: string;
};

export function createRunId(now = new Date()) {
  // deterministic enough, sortable, human readable
  const iso = now.toISOString().replace(/[:.]/g, "-");
  const rnd = crypto.randomBytes(3).toString("hex");
  return `${iso}_${rnd}`;
}

function projectsRoot(archivesDir: string) {
  return path.join(archivesDir, "projects");
}

export function runDir(archivesDir: string, projectId: string, runId: string) {
  return path.join(projectsRoot(archivesDir), projectId, runId);
}

export function latestPointerPath(archivesDir: string, projectId: string) {
  return path.join(projectsRoot(archivesDir), projectId, "latest.json");
}

export async function readLatestRunId(archivesDir: string, projectId: string) {
  const fp = latestPointerPath(archivesDir, projectId);
  try {
    const raw = await fs.readFile(fp, "utf-8");
    const json = JSON.parse(raw);
    const id = typeof json?.runId === "string" ? json.runId : null;
    return id;
  } catch {
    return null;
  }
}

export async function writeLatestRunId(
  archivesDir: string,
  projectId: string,
  runId: string
) {
  const fp = latestPointerPath(archivesDir, projectId);
  await ensureDir(path.dirname(fp));
  await fs.writeFile(fp, JSON.stringify({ runId }, null, 2) + "\n", "utf-8");
}

export async function readLegacyLatestRunId(archivesDir: string, repoKey: string) {
  const fp = path.join(archivesDir, repoKey, "latest.json");
  try {
    const raw = await fs.readFile(fp, "utf-8");
    const json = JSON.parse(raw);
    const id = typeof json?.runId === "string" ? json.runId : null;
    return id;
  } catch {
    return null;
  }
}

function projectMetaPath(projectDir: string) {
  return path.join(projectDir, "project.json");
}

async function readProjectMeta(projectDir: string) {
  const fp = projectMetaPath(projectDir);
  try {
    const raw = await fs.readFile(fp, "utf-8");
    const json = JSON.parse(raw);
    if (!json || typeof json?.projectId !== "string" || typeof json?.targetPath !== "string") {
      return null;
    }
    return json as { projectId: string; projectName: string; targetPath: string };
  } catch {
    return null;
  }
}

async function writeProjectMeta(projectDir: string, meta: { projectId: string; projectName: string; targetPath: string }) {
  const fp = projectMetaPath(projectDir);
  await fs.writeFile(fp, JSON.stringify(meta, null, 2) + "\n", "utf-8");
}

async function resolveProjectInfo(archivesDir: string, meta: RunMeta) {
  const projectName = path.basename(meta.targetPath || "") || "project";
  const root = projectsRoot(archivesDir);
  const baseId = projectName;
  const baseDir = path.join(root, baseId);
  const baseExists = await fs
    .stat(baseDir)
    .then((st) => st.isDirectory())
    .catch(() => false);
  if (!baseExists) {
    return { projectId: baseId, projectName, projectDir: baseDir, targetPath: meta.targetPath };
  }
  const baseMeta = await readProjectMeta(baseDir);
  if (baseMeta?.targetPath === meta.targetPath) {
    return { projectId: baseId, projectName, projectDir: baseDir, targetPath: meta.targetPath };
  }
  // Use a git-related hash when possible; avoid hash unless collision.
  const suffix = shortHash(meta.head || meta.repoKey || meta.targetPath, 6);
  let projectId = `${projectName}-${suffix}`;
  let projectDir = path.join(root, projectId);
  const exists = await fs
    .stat(projectDir)
    .then((st) => st.isDirectory())
    .catch(() => false);
  if (exists) {
    const meta2 = await readProjectMeta(projectDir);
    if (meta2?.targetPath === meta.targetPath) {
      return { projectId, projectName, projectDir, targetPath: meta.targetPath };
    }
    const alt = shortHash(meta.runId || meta.targetPath, 6);
    projectId = `${projectName}-${alt}`;
    projectDir = path.join(root, projectId);
  }
  return { projectId, projectName, projectDir, targetPath: meta.targetPath };
}

export async function findProjectIdByTargetPath(archivesDir: string, targetPath: string) {
  const root = projectsRoot(archivesDir);
  const rootExists = await fs
    .stat(root)
    .then((st) => st.isDirectory())
    .catch(() => false);
  if (!rootExists) return null;
  const projects = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  for (const p of projects) {
    if (!p.isDirectory()) continue;
    const projectDir = path.join(root, p.name);
    const pm = await readProjectMeta(projectDir);
    if (pm?.targetPath === targetPath) return p.name;
  }
  return null;
}

export async function writeRun(props: {
  archivesDir: string;
  runId: string;
  meta: RunMeta;
  reportMarkdown: string;
}): Promise<RunInfo> {
  const resolved = await resolveProjectInfo(props.archivesDir, props.meta);
  const dir = runDir(props.archivesDir, resolved.projectId, props.runId);
  await ensureDir(dir);
  await ensureDir(path.dirname(dir));

  const reportPath = path.join(dir, "report.md");
  const metaPath = path.join(dir, "meta.json");
  const meta: RunMeta = {
    ...props.meta,
    projectId: resolved.projectId,
    projectName: resolved.projectName,
  };

  await fs.writeFile(reportPath, props.reportMarkdown, "utf-8");
  await fs.writeFile(
    metaPath,
    JSON.stringify(meta, null, 2) + "\n",
    "utf-8"
  );
  await ensureDir(resolved.projectDir);
  await writeProjectMeta(resolved.projectDir, {
    projectId: resolved.projectId,
    projectName: resolved.projectName,
    targetPath: resolved.targetPath,
  });
  await writeLatestRunId(props.archivesDir, resolved.projectId, props.runId);

  return { meta, dir, reportPath, metaPath };
}

export async function readReportByRunId(
  archivesDir: string,
  projectId: string,
  runId: string
) {
  const fp = path.join(runDir(archivesDir, projectId, runId), "report.md");
  try {
    return await fs.readFile(fp, "utf-8");
  } catch {
    return null;
  }
}

export async function readLatestReport(archivesDir: string, projectId: string) {
  const runId = await readLatestRunId(archivesDir, projectId);
  if (!runId) return null;
  return await readReportByRunId(archivesDir, projectId, runId);
}

export async function readLegacyLatestReport(archivesDir: string, repoKey: string) {
  const runId = await readLegacyLatestRunId(archivesDir, repoKey);
  if (!runId) return null;
  const fp = path.join(archivesDir, repoKey, runId, "report.md");
  try {
    return await fs.readFile(fp, "utf-8");
  } catch {
    return null;
  }
}

export async function listRuns(archivesDir: string, projectId?: string) {
  const results: RunInfo[] = [];

  async function collectRunsUnder(dir: string, overrideProject?: { projectId: string; projectName: string }) {
    const items = await fs
      .readdir(dir, { withFileTypes: true })
      .catch(() => []);
    const runDirs = items
      .filter((d) => d.isDirectory())
      .map((d) => path.join(dir, d.name));

    for (const runDirPath of runDirs) {
      const metaPath = path.join(runDirPath, "meta.json");
      const reportPath = path.join(runDirPath, "report.md");
      try {
        const raw = await fs.readFile(metaPath, "utf-8");
        const meta = JSON.parse(raw) as RunMeta;
        if (!meta || typeof meta.runId !== "string") continue;
        if (overrideProject) {
          meta.projectId = meta.projectId || overrideProject.projectId;
          meta.projectName = meta.projectName || overrideProject.projectName;
        } else if (!meta.projectId) {
          const projectName = path.basename(meta.targetPath || "") || "project";
          const suffix = shortHash(meta.head || meta.repoKey || meta.targetPath, 6);
          meta.projectName = meta.projectName || projectName;
          meta.projectId = `${projectName}-${suffix}`;
        }
        results.push({ meta, dir: runDirPath, reportPath, metaPath });
      } catch {
        continue;
      }
    }
  }

  const root = projectsRoot(archivesDir);
  const rootExists = await fs
    .stat(root)
    .then((st) => st.isDirectory())
    .catch(() => false);
  if (rootExists) {
    if (projectId) {
      await collectRunsUnder(path.join(root, projectId));
    } else {
      const projects = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
      for (const p of projects) {
        if (!p.isDirectory()) continue;
        const projectDir = path.join(root, p.name);
        const pm = await readProjectMeta(projectDir);
        const projectName = pm?.projectName || p.name;
        await collectRunsUnder(projectDir, { projectId: p.name, projectName });
      }
    }
  }

  // Legacy fallback: scan old structure if no projectId filter
  if (!projectId) {
    const repos = await fs
      .readdir(archivesDir, { withFileTypes: true })
      .catch(() => []);
    for (const r of repos) {
      if (!r.isDirectory()) continue;
      if (r.name === "projects") continue;
      await collectRunsUnder(path.join(archivesDir, r.name));
    }
  }

  results.sort((a, b) => (a.meta.createdAt < b.meta.createdAt ? 1 : -1));
  return results;
}
