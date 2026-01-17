import * as p from "@clack/prompts";

type PromptModule = typeof p;

function getPrompts(): PromptModule {
  const g = globalThis as typeof globalThis & { __LITEWIKI_PROMPTS__?: PromptModule };
  return g.__LITEWIKI_PROMPTS__ ?? p;
}

export function intro(title = "litewiki") {
  getPrompts().intro(title);
}

export function outro(message: string) {
  getPrompts().outro(message);
}

export function cancel(message = "Canceled") {
  getPrompts().cancel(message);
}

export function isCancel(value: unknown): boolean {
  return getPrompts().isCancel(value);
}

export async function confirm(message: string, initialValue = false) {
  const prompts = getPrompts();
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
  const prompts = getPrompts();
  const cleaned: any = {
    message: props.message,
    options: props.options.map((o) =>
      o.hint ? o : { value: o.value, label: o.label }
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
  const prompts = getPrompts();
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
  const prompts = getPrompts();
  const s = prompts.spinner();
  s.start(label);
  return {
    stop(message?: string) {
      s.stop(message);
    },
  };
}

export const log = {
  info: (msg: string) => getPrompts().log.info(msg),
  success: (msg: string) => getPrompts().log.success(msg),
  warn: (msg: string) => getPrompts().log.warn(msg),
  error: (msg: string) => getPrompts().log.error(msg),
  message: (msg: string) => getPrompts().log.message(msg),
};
