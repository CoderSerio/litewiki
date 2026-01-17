import * as base from "../ui.js";

// Back sentinel value for selects
export const BACK_VALUE = "__back__" as const;

export async function selectWithBack<T extends string>(props: {
  message: string;
  options: { value: T; label: string; hint?: string }[];
  initialValue?: T;
  backLabel?: string;
}): Promise<T | typeof BACK_VALUE | null> {
  const backLabel = props.backLabel ?? "\u2190 Back"; // "← Back"
  const merged = [
    { value: BACK_VALUE as any, label: backLabel },
    ...props.options,
  ];
  const v = await base.select<any>({
    message: props.message,
    options: merged,
    initialValue: props.initialValue as any,
  });
  return v as any;
}

export const ui = base;
