type ClackModule = typeof import("@clack/prompts");

const CANCEL = Symbol.for("clack.cancel");
type LogLevel = "info" | "success" | "warn" | "error" | "message";

type Queue<T> = Array<T>;

type PromptCallLog = {
  intros: string[];
  outros: string[];
  confirms: string[];
  selects: string[];
  texts: string[];
  spinners: { start: string; stop?: string }[];
  logs: { level: LogLevel; message: string }[];
};

export type PromptQueues = {
  confirms?: Queue<boolean | typeof CANCEL>;
  selects?: Queue<string | typeof CANCEL>;
  texts?: Queue<string | null | typeof CANCEL>;
};

export function createTestPrompts(queues: PromptQueues = {}) {
  const confirmQueue = [...(queues.confirms ?? [])];
  const selectQueue = [...(queues.selects ?? [])];
  const textQueue = [...(queues.texts ?? [])];
  const logs: PromptCallLog = {
    intros: [],
    outros: [],
    confirms: [],
    selects: [],
    texts: [],
    spinners: [],
    logs: [],
  };

  const prompts = {
    intro(message?: string) {
      logs.intros.push(message ?? "");
    },
    outro(message: string) {
      logs.outros.push(message);
    },
    cancel(message?: string) {
      logs.logs.push({ level: "error", message: message ?? "Canceled" });
    },
    isCancel(value: unknown) {
      return value === CANCEL;
    },
    async confirm(opts: { message: string; initialValue?: boolean }) {
      logs.confirms.push(opts.message);
      if (confirmQueue.length === 0) return opts.initialValue ?? false;
      const next = confirmQueue.shift()!;
      if (next === CANCEL) return next;
      return next;
    },
    async select(opts: { message: string; options: any[]; initialValue?: string }) {
      logs.selects.push(opts.message);
      if (selectQueue.length === 0) return opts.initialValue ?? null;
      const next = selectQueue.shift()!;
      return next;
    },
    async text(opts: { message: string; initialValue?: string }) {
      logs.texts.push(opts.message);
      if (textQueue.length === 0) return opts.initialValue ?? "";
      const next = textQueue.shift();
      if (next === CANCEL) return next;
      return next ?? "";
    },
    spinner() {
      const entry: { start: string; stop?: string } = { start: "" };
      logs.spinners.push(entry);
      return {
        start(label: string) {
          entry.start = label;
        },
        stop(message?: string) {
          if (message !== undefined) entry.stop = message;
          else delete entry.stop;
        },
      };
    },
    log: {
      info(message: string) {
        logs.logs.push({ level: "info", message });
      },
      success(message: string) {
        logs.logs.push({ level: "success", message });
      },
      warn(message: string) {
        logs.logs.push({ level: "warn", message });
      },
      error(message: string) {
        logs.logs.push({ level: "error", message });
      },
      message(message: string) {
        logs.logs.push({ level: "message", message });
      },
    },
  } as unknown as ClackModule;

  return {
    prompts,
    logs,
    queues: {
      pushConfirm(value: boolean | typeof CANCEL) {
        confirmQueue.push(value);
      },
      pushSelect(value: string | typeof CANCEL) {
        selectQueue.push(value);
      },
      pushText(value: string | null | typeof CANCEL) {
        textQueue.push(value);
      },
    },
  };
}

export const CANCEL_TOKEN = CANCEL;
