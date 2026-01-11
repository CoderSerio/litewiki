import { createConfigStore } from "../../../config/store.js";
import { ensureDir } from "../../../utils/fs.js";
import * as ui from "../../ui.js";
import { editConfig } from "./utils.js";

export async function configCmd(props: { intro?: boolean }) {
  if (props.intro !== false) ui.intro("litewiki");
  const store = createConfigStore();
  const conf = store.readAll();
  await ensureDir(conf.configDir);

  // 直接进入编辑模式
  await editConfig(conf.configDir);
}
