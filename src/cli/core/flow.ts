// A tiny flow runner to unify multi-step CLI interactions with built-in back handling.
// Each step returns one of: next/back/exit; caller can carry a shared context object.

export type StepResult =
  | { type: "next"; goto?: number }
  | { type: "back" }
  | { type: "exit" };

export type Step<Ctx> = (ctx: Ctx) => Promise<StepResult>;

export function next(goto?: number): StepResult {
  return goto === undefined ? { type: "next" } : { type: "next", goto };
}

export function back(): StepResult {
  return { type: "back" };
}

export function exit(): StepResult {
  return { type: "exit" };
}

export async function runFlow<Ctx>(steps: Step<Ctx>[], ctx: Ctx, start = 0) {
  // Linear index with back support to ensure strict tree-like traversal.
  let idx = start;
  while (idx >= 0 && idx < steps.length) {
    const r = await steps[idx](ctx);
    if (r.type === "exit") return;
    if (r.type === "back") {
      idx -= 1; // go to previous step (parent)
      continue;
    }
    if (r.type === "next") {
      idx = r.goto ?? idx + 1; // move to child or next sibling
      continue;
    }
  }
}
