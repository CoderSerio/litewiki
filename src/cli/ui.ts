import * as p from "@clack/prompts";

export function intro(title = "litewiki") {
  p.intro(title);
}

export function outro(message: string) {
  p.outro(message);
}

export function cancel(message = "Canceled") {
  p.cancel(message);
}

export function isCancel(value: unknown): boolean {
  return p.isCancel(value);
}

export async function confirm(message: string, initialValue = false) {
  const v = await p.confirm({ message, initialValue });
  if (p.isCancel(v)) {
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
      o.hint ? o : { value: o.value, label: o.label }
    ),
  };
  if (props.initialValue !== undefined)
    cleaned.initialValue = props.initialValue;

  const v = await p.select(cleaned);
  if (p.isCancel(v)) {
    cancel();
    return null;
  }
  return v as T;
}

export async function text(message: string, initialValue?: string) {
  const opts: any = { message };
  if (initialValue !== undefined) opts.initialValue = initialValue;
  const v = await p.text(opts);
  if (p.isCancel(v)) {
    cancel();
    return null;
  }
  return String(v);
}

export function spinner(label: string) {
  const s = p.spinner();
  s.start(label);
  return {
    stop(message?: string) {
      s.stop(message);
    },
  };
}

export const log = {
  info: (msg: string) => p.log.info(msg),
  success: (msg: string) => p.log.success(msg),
  warn: (msg: string) => p.log.warn(msg),
  error: (msg: string) => p.log.error(msg),
  message: (msg: string) => p.log.message(msg),
};
