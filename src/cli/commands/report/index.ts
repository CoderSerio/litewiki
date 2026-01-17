import { reportsController, type ReportsAction } from "../../controllers/reportsController.js";

export async function reportsCmd(props: { action?: ReportsAction; dir?: string; limit?: number; intro?: boolean }) {
  await reportsController(props);
}

export function registerReportsCommand(cli: any) {
  cli
    .command(
      "reports [action] [dir]",
      "View archived reports (view/cat)"
    )
    .option("--limit <n>", "List limit", { default: "20" })
    .action(
      async (
        action?: ReportsAction,
        dir?: string,
        options?: { limit?: string }
      ) => {
        const limit = Number(options?.limit || "20");
        const args: {
          action?: ReportsAction;
          dir?: string;
          limit?: number;
          intro?: boolean;
        } = { intro: true };
        if (action !== undefined) args.action = action;
        if (dir !== undefined) args.dir = dir;
        args.limit = Number.isFinite(limit) ? limit : 20;

        await reportsCmd(args);
      }
    );
}
