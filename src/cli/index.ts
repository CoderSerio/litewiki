import { type CAC, cac } from "cac";
import { SUPPORTED_LOCALES, setLocale, t } from "../i18n/index.js";
import type { Locale } from "../i18n/index.js";
import { configCmd, registerConfigCommand } from "./commands/config/index.js";
import {
  profilesCmd,
  registerProfilesCommand,
} from "./commands/profile/index.js";
import { registerReportsCommand, reportsCmd } from "./commands/report/index.js";
import { registerRunCommand, runCmd } from "./commands/run/index.js";
import * as ui from "./ui.js";

type RootAction = "run" | "profile" | "report" | "config" | "language" | "help";

const ActionMap: Record<RootAction, (cli: CAC) => Promise<void>> = {
  run: async (_) => {
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
  language: async (_) => {
    const locale = await ui.select<Locale>({
      message: t("language.select"),
      options: SUPPORTED_LOCALES,
    });
    if (locale) {
      setLocale(locale);
      ui.log.success(t("language.changed"));
    }
  },
  help: async (cli: CAC) => {
    cli.outputHelp();
    ui.outro(t("cli.done"));
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
      ui.intro(t("cli.title"));
      const action = await ui.select<RootAction>({
        message: t("cli.selectAction"),
        options: [
          {
            value: "run",
            label: t("cli.action.run"),
            hint: t("cli.action.run.hint"),
          },
          {
            value: "report",
            label: t("cli.action.report"),
            hint: t("cli.action.report.hint"),
          },
          {
            value: "profile",
            label: t("cli.action.profile"),
            hint: t("cli.action.profile.hint"),
          },
          {
            value: "config",
            label: t("cli.action.config"),
            hint: t("cli.action.config.hint"),
          },
          {
            value: "language",
            label: t("cli.action.language"),
            hint: t("cli.action.language.hint"),
          },
          {
            value: "help",
            label: t("cli.action.help"),
            hint: t("cli.action.help.hint"),
          },
        ],
        initialValue: "run",
      });
      if (!action) return;

      await ActionMap[action]?.(cli);
    }
  }

  cli.parse(argv);
}
