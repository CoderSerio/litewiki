// Thin wrapper that delegates to the controller implementation
import { runController } from "../../controllers/runController.js";

export async function runCmd(props: { dirArg?: string; profile?: string; intro?: boolean }) {
  await runController(props);
}

export function registerRunCommand(cli: any) {
  cli
    .command("run [dir]", "Analyze a directory (default: current directory)")
    .option("--profile <id>", "Pick prompt profile (skip interactive)")
    .action(async (dir?: string, options?: { profile?: string }) => {
      if (options?.profile !== undefined) {
        const args: { dirArg?: string; profile?: string; intro?: boolean } = {
          intro: true,
          profile: options.profile,
        };
        if (dir !== undefined) args.dirArg = dir;
        await runCmd(args);
        return;
      }
      const args: { dirArg?: string; intro?: boolean } = { intro: true };
      if (dir !== undefined) args.dirArg = dir;
      await runCmd(args);
    });
}
