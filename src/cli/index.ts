import { type CAC, cac } from "cac";
import { configCmd, registerConfigCommand } from "./commands/config/index.js";
import {
  profilesCmd,
  registerProfilesCommand,
} from "./commands/profile/index.js";
import { registerReportsCommand, reportsCmd } from "./commands/report/index.js";
import { registerRunCommand, runCmd } from "./commands/run/index.js";
import * as ui from "./ui.js";

type RootAction = "run" | "profile" | "report" | "config" | "help";

const ActionMap: Record<RootAction, (cli: CAC) => Promise<void>> = {
  run: async (_) => {
    // interactive entry should trigger run flow directly
    await runCmd({ intro: false });
  },
  profile: async (_) => {
    await profilesCmd({ intro: false });
  },
  report: async (_) => {
    await reportsCmd({ intro: false });
  },
  config: async (_) => {
    await configCmd({ intro: false });
  },
  help: async (cli: CAC) => {
    cli.outputHelp();
    ui.outro("done");
  },
};

export async function cliMain(argv: string[]) {
  const cli = cac("wiki");

  registerRunCommand(cli);
  registerProfilesCommand(cli);
  registerReportsCommand(cli);
  registerConfigCommand?.(cli);

  cli.on("command:*", () => {
    ui.intro("litewiki");
    cli.outputHelp();
    ui.outro("Unknown command");
    process.exitCode = 1;
  });

  cli.help();

  // when there's no subcommand, give a minimal interactive entry (otherwise users will be confused by the empty output)
  if (argv.length <= 2) {
    while (true) {
      ui.intro("litewiki");
      const action = await ui.select<RootAction>({
        message: "Select an action",
        options: [
          { value: "run", label: "run", hint: "Analyze a directory" },
          { value: "report", label: "report", hint: "View archived reports" },
          {
            value: "profile",
            label: "profile",
            hint: "Manage prompt profiles",
          },
          { value: "config", label: "config", hint: "System configuration" },
          { value: "help", label: "help", hint: "Show all commands" },
          // { value: "config", label: "config", hint: "系统配置" },
          // It seems stupid if we supply a exit option in a CLI tool.
          // WHY DO NOT JUST USE CTRL+C TO EXIT
          // And another question is: what's the best way to edit long text in a ClI tool?
          // { value: "exit", label: "exit" },
        ],
        initialValue: "run",
      });
      if (!action) return;

      await ActionMap[action]?.(cli);
    }
  }

  cli.parse(argv);
}
