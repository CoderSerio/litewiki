import { ui } from "../core/ui.js";

export type RunMode = "fresh" | "incremental";

export async function pickRunMode(): Promise<RunMode | null> {
  const mode = await ui.select<RunMode>({
    message: "Run mode",
    options: [
      { value: "fresh", label: "fresh", hint: "Generate from scratch" },
      {
        value: "incremental",
        label: "incremental",
        hint: "Incrementally update based on previous report",
      },
    ],
    initialValue: "fresh",
  });
  return mode || null;
}
