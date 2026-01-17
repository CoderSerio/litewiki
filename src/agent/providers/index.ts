// Provider router. For now we only support siliconflow, but keep the shape
// so future providers can be plugged in without touching callers.

import { runDeepWikiAgent as runWithSiliconFlow } from "./siliconflow.js";

export type RunDeepWikiAgentOptions = {
  systemPrompt?: string;
  extensions?: string[];
  priorReport?: string;
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

type AgentOverride = (cwd: string, opts?: RunDeepWikiAgentOptions) => Promise<string>;

export async function runDeepWikiAgent(cwd: string, opts?: RunDeepWikiAgentOptions) {
  const g = globalThis as typeof globalThis & { __LITEWIKI_AGENT__?: AgentOverride };
  if (typeof g.__LITEWIKI_AGENT__ === "function") {
    return await g.__LITEWIKI_AGENT__(cwd, opts);
  }
  const provider = (opts?.provider || "siliconflow").toLowerCase();
  // Only siliconflow for now
  return await runWithSiliconFlow(cwd, opts as any);
}
