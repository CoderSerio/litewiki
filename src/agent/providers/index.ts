// Provider router. Keep the shape so future providers can be plugged in without touching callers.

import { runDeepWikiAgent as runWithOpenAiChatCompletions } from "./openaiChatCompletions.js";
import { normalizeProviderId } from "./providerCatalog.js";

export type RunDeepWikiAgentOptions = {
  systemPrompt?: string;
  extensions?: string[];
  priorReport?: string;
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

export async function runDeepWikiAgent(cwd: string, opts?: RunDeepWikiAgentOptions) {
  const provider = normalizeProviderId(opts?.provider);
  if (provider === "openai") {
    return await runWithOpenAiChatCompletions(cwd, opts as any);
  }
  throw new Error(`Provider not supported yet: ${provider}`);
}
