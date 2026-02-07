import { ui } from "../core/ui.js";
import { t } from "../../i18n/index.js";

export type RunMode = "fresh" | "incremental";

export async function pickRunMode(): Promise<RunMode | null> {
  const mode = await ui.select<RunMode>({
    message: t("pickMode.message"),
    options: [
      {
        value: "fresh",
        label: t("pickMode.fresh"),
        hint: t("pickMode.fresh.hint"),
      },
      {
        value: "incremental",
        label: t("pickMode.incremental"),
        hint: t("pickMode.incremental.hint"),
      },
    ],
    initialValue: "fresh",
  });
  return mode || null;
}
