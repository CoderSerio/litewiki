import { createConfigStore } from "../../../config/store.js";
import { ensureDir } from "../../../utils/fs.js";
import * as ui from "../../ui.js";
import { setConfig, showConfig } from "./utils.js";

type ConfigAction = "show" | "set";

export async function configCmd(props: { id?: string; intro?: boolean }) {
  if (props.intro !== false) ui.intro("litewiki");
  const store = createConfigStore();
  const conf = store.readAll();
  await ensureDir(conf.configDir);

  const act = await ui.select<ConfigAction>({
    message: "config",
    options: [
      { value: "show", label: "show" },
      { value: "set", label: "set" },
    ],
    initialValue: "show",
  });

  if (!act) return;

  if (act === "show") {
    const list = await showConfig(conf.configDir);
    console.log(list);
    return;
  }

  if (act === "set") {
    const config = await setConfig(conf.configDir);
    return;
  }
}
