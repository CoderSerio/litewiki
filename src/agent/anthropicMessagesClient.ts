type OpenAiToolMeta = {
  type?: string;
  function?: {
    name?: string;
    description?: string;
    parameters?: unknown;
  };
};

type OpenAiToolCall = {
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: unknown };
  name?: string;
  args?: unknown;
};

type OpenAiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: unknown;
  tool_call_id?: string;
  name?: string;
  tool_calls?: OpenAiToolCall[];
};

type AnthropicTool = {
  name: string;
  description?: string;
  input_schema?: unknown;
};

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, any> }
  | { type: "tool_result"; tool_use_id: string; content: string };

type AnthropicMessage = {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
};

type AnthropicResponse = {
  content?: Array<{
    type?: string;
    text?: string;
    id?: string;
    name?: string;
    input?: unknown;
  }>;
};

type ChatCompletionsLikeResponse = {
  choices: Array<{
    message: {
      role: "assistant";
      content: string;
      tool_calls?: Array<{
        id?: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    };
  }>;
};

export function toAnthropicTools(tools: unknown[]): AnthropicTool[] {
  return (tools || [])
    .map((tool) => tool as OpenAiToolMeta)
    .filter((tool) => tool?.type === "function" && tool.function?.name)
    .map((tool) => ({
      name: String(tool.function?.name || ""),
      description: tool.function?.description ?? undefined,
      input_schema: tool.function?.parameters,
    })) as AnthropicTool[];
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) =>
        typeof item?.text === "string" ? item.text : String(item?.text ?? ""),
      )
      .join("\n");
  }
  if (content === null || content === undefined) return "";
  return String(content);
}

function parseToolCallInput(call: OpenAiToolCall): Record<string, any> {
  const raw = call.function?.arguments ?? call.args;
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object")
        return parsed as Record<string, any>;
      return {};
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw as Record<string, any>;
  return {};
}

export function toAnthropicMessages(messages: OpenAiMessage[]): {
  system?: string;
  messages: AnthropicMessage[];
} {
  const systemParts: string[] = [];
  const out: AnthropicMessage[] = [];

  for (const message of messages) {
    if (message.role === "system") {
      const text = extractText(message.content).trim();
      if (text) systemParts.push(text);
      continue;
    }

    if (message.role === "tool") {
      const content = extractText(message.content);
      out.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: String(message.tool_call_id || ""),
            content,
          },
        ],
      });
      continue;
    }

    if (message.role === "assistant") {
      const blocks: AnthropicContentBlock[] = [];
      const text = extractText(message.content).trim();
      if (text) blocks.push({ type: "text", text });

      for (const call of message.tool_calls || []) {
        const name = call.function?.name ?? call.name;
        if (!name) continue;
        blocks.push({
          type: "tool_use",
          id: String(call.id || ""),
          name: String(name),
          input: parseToolCallInput(call),
        });
      }

      out.push({
        role: "assistant",
        content: blocks.length ? blocks : "",
      });
      continue;
    }

    // user
    out.push({
      role: "user",
      content: extractText(message.content),
    });
  }

  const system = systemParts.length ? systemParts.join("\n\n") : undefined;
  const result: { system?: string; messages: AnthropicMessage[] } = {
    messages: out,
  };
  if (system) result.system = system;
  return result;
}

export function toOpenAiChatResponse(
  data: AnthropicResponse,
): ChatCompletionsLikeResponse {
  const blocks = Array.isArray(data?.content) ? data.content : [];
  const text = blocks
    .filter((b) => b?.type === "text")
    .map((b) => String(b.text || ""))
    .join("\n");
  const toolCalls = blocks
    .filter((b) => b?.type === "tool_use" && b.name)
    .map((b) => ({
      id: b.id ? String(b.id) : undefined,
      type: "function" as const,
      function: {
        name: String(b.name || ""),
        arguments: JSON.stringify(b.input ?? {}),
      },
    }))
    .filter((tc) => tc.id !== undefined);

  return {
    choices: [
      {
        message: {
          role: "assistant",
          content: text,
          tool_calls: toolCalls.length ? (toolCalls as any) : undefined,
        },
      },
    ],
  };
}

export function createAnthropicMessagesClient(props: {
  apiKey: string;
  baseUrl: string;
  version?: string;
}) {
  const { apiKey, baseUrl, version = "2023-06-01" } = props;

  async function chat(request: {
    model: string;
    messages: OpenAiMessage[];
    tools: unknown[];
  }) {
    const { system, messages } = toAnthropicMessages(request.messages);
    const tools = toAnthropicTools(request.tools);

    const body: Record<string, any> = {
      model: request.model,
      max_tokens: 4096,
      temperature: 0.7,
      messages,
    };
    if (system) body.system = system;
    if (tools.length) {
      body.tools = tools;
      body.tool_choice = { type: "auto" };
    }

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": version,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic Messages error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as AnthropicResponse;
    return toOpenAiChatResponse(data);
  }

  return { chat };
}
