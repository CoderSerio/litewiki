import { cac } from "cac";
import path from "node:path";
import fs from "node:fs/promises";
import {
  findGitRoot,
  getGitHeadShort,
  getGitRemoteOriginUrl,
  getGitStatusDirty,
} from "../utils/git.js";
import { runDeepWikiAgent } from "../agent/provider.js";
import * as ui from "./ui.js";

type RunMode = "fresh" | "incremental";
type RootAction = "run" | "help" | "exit";

async function resolveTargetDir(raw?: string) {
  const p = raw && raw.trim().length > 0 ? raw : process.cwd();
  const abs = path.resolve(process.cwd(), p);
  const st = await fs.stat(abs);
  if (!st.isDirectory()) throw new Error(`不是目录: ${abs}`);
  return abs;
}

async function runCommand(dirArg?: string) {
  ui.intro("litewiki");

  let targetDir: string;
  try {
    targetDir = await resolveTargetDir(dirArg);
  } catch (e) {
    ui.outro(String(e));
    process.exitCode = 1;
    return;
  }

  const repoRoot = await findGitRoot(targetDir);
  if (repoRoot) {
    const [head, dirty, remote] = await Promise.all([
      getGitHeadShort(repoRoot),
      getGitStatusDirty(repoRoot),
      getGitRemoteOriginUrl(repoRoot),
    ]);

    const descParts = [
      `目标: ${targetDir}`,
      `Git: ${repoRoot}`,
      head ? `HEAD: ${head}` : null,
      dirty == null ? null : dirty ? `状态: 有未提交变更` : `状态: 干净`,
      remote ? `remote: ${remote}` : null,
    ].filter(Boolean);

    const ok = await ui.confirm(`${descParts.join("\n")}\n\n继续分析？`, false);
    if (!ok) return;
  }

  const mode = await ui.select<RunMode>({
    message: "生成模式",
    options: [
      { value: "fresh", label: "fresh", hint: "从零生成" },
      {
        value: "incremental",
        label: "incremental",
        hint: "基于上次结果增量更新",
      },
    ],
    initialValue: "fresh",
  });
  if (!mode) return;

  // NOTE: incremental 的“读取上次报告 + 归档”在后续 todo 实现；
  // 这里先把“选择模式”接进交互，避免后面再改 CLI。
  const spin = ui.spinner("运行 agent...");
  try {
    const report = await runDeepWikiAgent(targetDir);
    spin.stop("完成");
    ui.outro(report);
  } catch (e) {
    spin.stop("失败");
    ui.outro(String(e));
    process.exitCode = 1;
  }
}

export async function cliMain(argv: string[]) {
  const cli = cac("wiki");

  cli
    .command("run [dir]", "分析目录（默认当前目录）")
    .action(async (dir?: string) => {
      await runCommand(dir);
    });

  // 兼容旧命令：show -> run
  cli
    .command("show [dir]", "（兼容）旧命令，等价于 run")
    .action(async (dir?: string) => {
      await runCommand(dir);
    });

  cli.on("command:*", () => {
    ui.intro("litewiki");
    cli.outputHelp();
    ui.outro("未知命令");
    process.exitCode = 1;
  });

  cli.help();

  // 没有子命令时给一个最小可交互入口（否则用户看到“空输出”很困惑）
  if (argv.length <= 2) {
    ui.intro("litewiki");
    const action = await ui.select<RootAction>({
      message: "选择操作",
      options: [
        { value: "run", label: "run", hint: "分析一个目录" },
        { value: "help", label: "help", hint: "查看所有命令" },
        { value: "exit", label: "exit" },
      ],
      initialValue: "run",
    });
    if (!action || action === "exit") return;
    if (action === "help") {
      cli.outputHelp();
      ui.outro("done");
      return;
    }
    const dir = await ui.text("目录路径", process.cwd());
    if (!dir) return;
    await runCommand(dir);
    return;
  }

  cli.parse(argv);
}
