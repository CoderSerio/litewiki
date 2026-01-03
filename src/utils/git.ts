import { execa } from "execa";
import path from "node:path";
import fs from "node:fs";

export async function checkIsRepo(props: { cwd: string }) {
  const { cwd } = props;
  let currentCwd = cwd;
  let lastCwd = "";

  const checkCwd = (cwd: string) => {
    if (fs.existsSync(path.join(cwd, ".git"))) {
      return true;
    }
    return false;
  };

  while (currentCwd !== lastCwd) {
    if (checkCwd(currentCwd)) {
      return true;
    }
    lastCwd = currentCwd;
    currentCwd = path.join(currentCwd, "..");
  }

  return false;
}

export async function getGitLog() {
  const { stdout } = await execa("git", ["log", "-1", "--pretty=%B"]);
  return stdout;
}
