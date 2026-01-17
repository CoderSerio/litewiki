import * as ui from "../../ui.js";
import { configController } from "../../controllers/configController.js";

export async function configCmd(props: { intro?: boolean }) {
  if (props.intro !== false) ui.intro("litewiki");
  // Delegate to new multi-config controller
  await configController({ intro: false });
}

export function registerConfigCommand(cli: any) {
  cli.command("config", "Manage API configs").action(async () => {
    await configCmd({ intro: true });
  });
}
