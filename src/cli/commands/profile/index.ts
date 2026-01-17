import * as ui from "../../ui.js";
import { profilesController } from "../../controllers/profilesController.js";

export async function profilesCmd(props: { intro?: boolean }) {
  if (props.intro !== false) ui.intro("litewiki");
  await profilesController({ intro: false });
}

export function registerProfilesCommand(cli: any) {
  cli.command("profiles", "Manage prompt profiles").action(async () => {
    await profilesCmd({ intro: true });
  });
}
