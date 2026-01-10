import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

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
};

export type RunInfo = {
  meta: RunMeta;
  dir: string;
  reportPath: string;
  metaPath: string;
};

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export function sha1(s: string) {
  return crypto.createHash("sha1").update(s).digest("hex");
}

export async function computeRepoKey(props: {
  targetDir: string;
  repoRoot?: string | null;
  remote?: string | null;
}) {
  const real = await fs.realpath(props.targetDir).catch(() => props.targetDir);
  if (props.repoRoot) {
    const rootReal = await fs
      .realpath(props.repoRoot)
      .catch(() => props.repoRoot as string);
    const basis = `${props.remote || ""}\n${rootReal}`;
    return sha1(basis);
  }
  return sha1(real);
}

export function createRunId(now = new Date()) {
  // deterministic enough, sortable, human readable
  const iso = now.toISOString().replace(/[:.]/g, "-");
  const rnd = crypto.randomBytes(3).toString("hex");
  return `${iso}_${rnd}`;
}

export function runDir(archivesDir: string, repoKey: string, runId: string) {
  return path.join(archivesDir, repoKey, runId);
}

export function latestPointerPath(archivesDir: string, repoKey: string) {
  return path.join(archivesDir, repoKey, "latest.json");
}

export async function readLatestRunId(archivesDir: string, repoKey: string) {
  const fp = latestPointerPath(archivesDir, repoKey);
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
  repoKey: string,
  runId: string
) {
  const fp = latestPointerPath(archivesDir, repoKey);
  await ensureDir(path.dirname(fp));
  await fs.writeFile(fp, JSON.stringify({ runId }, null, 2) + "\n", "utf-8");
}

export async function writeRun(props: {
  archivesDir: string;
  repoKey: string;
  runId: string;
  meta: RunMeta;
  reportMarkdown: string;
}): Promise<RunInfo> {
  const dir = runDir(props.archivesDir, props.repoKey, props.runId);
  await ensureDir(dir);

  const reportPath = path.join(dir, "report.md");
  const metaPath = path.join(dir, "meta.json");

  await fs.writeFile(reportPath, props.reportMarkdown, "utf-8");
  await fs.writeFile(
    metaPath,
    JSON.stringify(props.meta, null, 2) + "\n",
    "utf-8"
  );
  await writeLatestRunId(props.archivesDir, props.repoKey, props.runId);

  return { meta: props.meta, dir, reportPath, metaPath };
}

export async function readReportByRunId(
  archivesDir: string,
  repoKey: string,
  runId: string
) {
  const fp = path.join(runDir(archivesDir, repoKey, runId), "report.md");
  try {
    return await fs.readFile(fp, "utf-8");
  } catch {
    return null;
  }
}

export async function readLatestReport(archivesDir: string, repoKey: string) {
  const runId = await readLatestRunId(archivesDir, repoKey);
  if (!runId) return null;
  return await readReportByRunId(archivesDir, repoKey, runId);
}

export async function listRuns(archivesDir: string, repoKey?: string) {
  const results: RunInfo[] = [];

  async function collectRunsUnder(dir: string) {
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
        results.push({ meta, dir: runDirPath, reportPath, metaPath });
      } catch {
        continue;
      }
    }
  }

  if (repoKey) {
    await collectRunsUnder(path.join(archivesDir, repoKey));
  } else {
    // 全局：runs/<repoKey>/<runId>/...
    const repos = await fs
      .readdir(archivesDir, { withFileTypes: true })
      .catch(() => []);
    for (const r of repos) {
      if (!r.isDirectory()) continue;
      await collectRunsUnder(path.join(archivesDir, r.name));
    }
  }

  results.sort((a, b) => (a.meta.createdAt < b.meta.createdAt ? 1 : -1));
  return results;
}
