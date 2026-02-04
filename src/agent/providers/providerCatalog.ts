export type ProviderId = "openai" | "anthropic" | "google" | "custom";

export type ProviderEntry = {
  id: ProviderId;
  label: string;
  status: "supported" | "unsupported";
  hint?: string;
};

export const PROVIDERS: ProviderEntry[] = [
  {
    id: "openai",
    label: "openai",
    status: "supported",
    hint: "Chat Completions / OpenAI-compatible",
  },
  {
    id: "anthropic",
    label: "anthropic",
    status: "supported",
    hint: "Anthropic Messages API",
  },
  {
    id: "google",
    label: "google",
    status: "supported",
    hint: "Gemini generateContent",
  },
  {
    id: "custom",
    label: "custom",
    status: "unsupported",
    hint: "Not supported yet (use when you have a compatible endpoint; adapter TBD).",
  },
];

export function isProviderSupported(id: string): boolean {
  return PROVIDERS.some(
    (p) => p.id === (id as ProviderId) && p.status === "supported",
  );
}

export function normalizeProviderId(raw: string | undefined): ProviderId {
  const v = String(raw || "")
    .trim()
    .toLowerCase();
  if (v === "openai") return "openai";
  if (v === "anthropic") return "anthropic";
  if (v === "google") return "google";
  if (v === "custom") return "custom";
  // legacy compatibility (previous interface-type providers)
  if (v === "openai-chat-completions") return "openai";
  if (v === "openai-responses") return "openai";
  if (v === "anthropic-messages" || v === "anthropic-openai-compatible")
    return "anthropic";
  if (v === "gemini-generate-content") return "google";
  if (v === "ollama-openai-chat-completions") return "custom";
  if (v === "siliconflow") return "custom";
  return "custom";
}
