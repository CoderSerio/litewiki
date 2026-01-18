import { resolveInputDir } from "../../utils/path.js";
import { ui } from "../core/ui.js";

export async function pickDirectory(
  initialArg?: string,
): Promise<string | null> {
  try {
    const dir = await resolveInputDir(initialArg);
    return dir;
  } catch (e) {
    ui.outro(String(e));
    return null;
  }
}
