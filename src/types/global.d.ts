import type { RunDeepWikiAgentOptions } from "../agent/providers/index.js";

type ClackModule = typeof import("@clack/prompts");

declare global {
  var __LITEWIKI_PROMPTS__: ClackModule | undefined;
  var __LITEWIKI_AGENT__:
    | ((cwd: string, opts?: RunDeepWikiAgentOptions) => Promise<string>)
    | undefined;
}

export {};
