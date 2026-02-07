import { configController } from "../../controllers/configController.js";
import * as ui from "../../ui.js";
import { t } from "../../../i18n/index.js";

export async function configCmd(props: { intro?: boolean }) {
  if (props.intro !== false) ui.intro(t("cli.title"));
  // Delegate to new multi-config controller
  await configController({ intro: false });
}

export function registerConfigCommand(cli: any) {
  cli.command("config", "Manage API configs").action(async () => {
    await configCmd({ intro: true });
  });
}
