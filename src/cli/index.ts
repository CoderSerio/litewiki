import { CAC, cac } from "cac";
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

type RootAction = "run" | "profiles" | "reports" | "config" | "help";

const ActionMap: Record<RootAction, (cli: CAC) => void> = {
  run: (_) => {
    profilesCmd({ intro: false });
  },
  profiles: (_) => {
    profilesCmd({ intro: false });
  },
  reports: (_) => {
    reportsCmd({ intro: false });
  },
  config: (cli: CAC) => {
    // configCmd({ intro: false });
  },
  help: (cli: CAC) => {
    cli.outputHelp();
    ui.outro("done");
  },
};

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

  // when there's no subcommand, give a minimal interactive entry (otherwise users will be confused by the empty output)
  if (argv.length <= 2) {
    ui.intro("litewiki");
    const action = await ui.select<RootAction>({
      message: "选择操作",
      options: [
        { value: "run", label: "run", hint: "分析一个目录" },
        { value: "reports", label: "reports", hint: "查看已生成报告" },
        { value: "help", label: "help", hint: "查看所有命令" },
        { value: "config", label: "config", hint: "系统配置" },
        // It seems stupid if we supply a exit option in a CLI tool.
        // WHY DO NOT JUST USE CTRL+C TO EXIT
        // And another question is: what's the best way to edit long text in a ClI tool?

        // { value: "profiles", label: "profiles", hint: "管理 prompt profiles" },
        // { value: "exit", label: "exit" },
      ],
      initialValue: "run",
    });
    if (!action) return;

    ActionMap[action]?.(cli);

    const dir = await ui.text("目录路径", process.cwd());
    if (!dir) return;
    await runCmd({ dirArg: dir, intro: false });
    return;
  }

  cli.parse(argv);
}
