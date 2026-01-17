// Provider router. For now we only support siliconflow, but keep the shape
// so future providers can be plugged in without touching callers.

import { runDeepWikiAgent as runWithSiliconFlow } from "./siliconflow.js";

export async function runDeepWikiAgent(
  cwd: string,
  opts?: {
    systemPrompt?: string;
    extensions?: string[];
    priorReport?: string;
    provider?: string;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  }
) {
  const provider = (opts?.provider || "siliconflow").toLowerCase();
  // Only siliconflow for now
  return await runWithSiliconFlow(cwd, opts as any);
}

