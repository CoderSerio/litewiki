import { cac } from "cac";
import { registerRunCommand, runCmd } from "./commands/run/index.js";
import {
  registerProfilesCommand,
  profilesCmd,
} from "./commands/profiles/index.js";
import {
  registerReportsCommand,
  reportsCmd,
} from "./commands/reports/index.js";
import * as ui from "./ui.js";

type RootAction = "run" | "profiles" | "reports" | "help" | "exit";

export async function cliMain(argv: string[]) {
  const cli = cac("wiki");

  registerRunCommand(cli);
  registerProfilesCommand(cli);
  registerReportsCommand(cli);

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
        { value: "profiles", label: "profiles", hint: "管理 prompt profiles" },
        { value: "reports", label: "reports", hint: "查看已生成报告" },
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

    if (action === "profiles") {
      await profilesCmd({ intro: false });
      return;
    }

    if (action === "reports") {
      await reportsCmd({ intro: false });
      return;
    }

    const dir = await ui.text("目录路径", process.cwd());
    if (!dir) return;
    await runCmd({ dirArg: dir, intro: false });
    return;
  }

  cli.parse(argv);
}
