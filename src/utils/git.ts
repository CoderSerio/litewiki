import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";

export async function findGitRoot(startDir: string): Promise<string | null> {
  let current = startDir;
  let last = "";

  while (current !== last) {
    if (
      await fs
        .access(path.join(current, ".git"))
        .then(() => true)
        .catch(() => false)
    )
      return current;
    last = current;
    current = path.dirname(current);
  }
  return null;
}

export async function checkIsRepo(props: { cwd: string }) {
  return (await findGitRoot(props.cwd)) != null;
}

async function tryGit(cwd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execa("git", args, { cwd });
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function getGitHeadShort(repoRoot: string) {
  return await tryGit(repoRoot, ["rev-parse", "--short", "HEAD"]);
}

export async function getGitRemoteOriginUrl(repoRoot: string) {
  return await tryGit(repoRoot, ["config", "--get", "remote.origin.url"]);
}

export async function getGitStatusDirty(
  repoRoot: string,
): Promise<boolean | null> {
  const out = await tryGit(repoRoot, ["status", "--porcelain"]);
  if (out == null) return null;
  return out.length > 0;
}

export async function getGitLog() {
  const { stdout } = await execa("git", ["log", "-1", "--pretty=%B"]);
  return stdout;
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
