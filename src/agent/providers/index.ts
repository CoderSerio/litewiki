// Provider router. Keep the shape so future providers can be plugged in without touching callers.

import { runDeepWikiAgent as runWithAnthropicMessages } from "./anthropicMessages.js";
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

export async function runDeepWikiAgent(
  cwd: string,
  opts?: RunDeepWikiAgentOptions,
) {
  const provider = normalizeProviderId(opts?.provider);
  if (provider === "openai") {
    return await runWithOpenAiChatCompletions(
      cwd,
      opts as unknown as Parameters<typeof runWithOpenAiChatCompletions>[1],
    );
  }
  if (provider === "anthropic") {
    return await runWithAnthropicMessages(
      cwd,
      opts as unknown as Parameters<typeof runWithAnthropicMessages>[1],
    );
  }
  throw new Error(`Provider not supported yet: ${provider}`);
}
