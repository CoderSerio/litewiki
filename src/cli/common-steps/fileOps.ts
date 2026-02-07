import fs from "node:fs/promises";
import path from "node:path";
import { t } from "../../i18n/index.js";
import { ui } from "../core/ui.js";

/** Ask user whether to delete a broken file or directory. Returns true if deleted. */
export async function maybeDeleteBrokenPath(opts: {
  targetPath: string;
  reason?: string;
  isDir?: boolean; // if not provided, inferred by fs.stat
}): Promise<boolean> {
  const inferredIsDir = await fs
    .stat(opts.targetPath)
    .then((st) => st.isDirectory())
    .catch(() => Boolean(opts.isDir));
  const ok = await ui.confirm(
    `${opts.reason ? opts.reason + "\n\n" : ""}${opts.targetPath}\n\n${t("fileOps.deleteConfirm")}`,
    false,
  );
  if (!ok) return false;
  try {
    await fs.rm(opts.targetPath, { recursive: true, force: true });
    ui.log.success(t("fileOps.deleted", { path: opts.targetPath }));
    return true;
  } catch (e) {
    ui.log.error(`Delete failed: ${String(e)}`);
    return false;
  }
}
