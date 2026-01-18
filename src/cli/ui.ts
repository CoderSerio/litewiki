import * as prompts from "@clack/prompts";

export function intro(title = "litewiki") {
  prompts.intro(title);
}

export function outro(message: string) {
  prompts.outro(message);
}

export function cancel(message = "Canceled") {
  prompts.cancel(message);
}

export function isCancel(value: unknown): boolean {
  return prompts.isCancel(value);
}

export async function confirm(message: string, initialValue = false) {
  const v = await prompts.confirm({ message, initialValue });
  if (prompts.isCancel(v)) {
    cancel();
    return null;
  }
  return Boolean(v);
}

export async function select<T extends string>(props: {
  message: string;
  options: { value: T; label: string; hint?: string }[];
  initialValue?: T;
}) {
  const cleaned: any = {
    message: props.message,
    options: props.options.map((o) =>
      o.hint ? o : { value: o.value, label: o.label },
    ),
  };
  if (props.initialValue !== undefined)
    cleaned.initialValue = props.initialValue;

  const v = await prompts.select(cleaned);
  if (prompts.isCancel(v)) {
    cancel();
    return null;
  }
  return v as T;
}

export async function text(message: string, initialValue?: string) {
  const opts: any = { message };
  if (initialValue !== undefined) opts.initialValue = initialValue;
  const v = await prompts.text(opts);
  if (prompts.isCancel(v)) {
    cancel();
    return null;
  }
  return String(v);
}

export function spinner(label: string) {
  const s = prompts.spinner();
  s.start(label);
  return {
    stop(message?: string) {
      s.stop(message);
    },
  };
}

export const log = {
  info: (msg: string) => prompts.log.info(msg),
  success: (msg: string) => prompts.log.success(msg),
  warn: (msg: string) => prompts.log.warn(msg),
  error: (msg: string) => prompts.log.error(msg),
  message: (msg: string) => prompts.log.message(msg),
};
