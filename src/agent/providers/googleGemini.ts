import { runAgent } from "../run.js";
import {
  listDirectoryTool,
  readFileTool,
  renderMermaidTool,
} from "../tools/index.js";

type OpenAiTool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

type OpenAiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: unknown;
  name?: string;
  tool_calls?: Array<{
    id?: string;
    name?: string;
    function?: { name?: string; arguments?: unknown };
    args?: unknown;
  }>;
};

type GeminiFunctionCall = {
  name: string;
  args?: Record<string, unknown>;
};

type GeminiPart = {
  text?: string;
  functionCall?: GeminiFunctionCall;
  functionResponse?: {
    name: string;
    response: { content: string };
  };
};

type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

function normalizeTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) =>
        typeof (c as { text?: unknown } | null)?.text === "string"
          ? (c as { text: string }).text || ""
          : "",
      )
      .join("");
  }
  if (content == null) return "";
  return String(content);
}

function parseFunctionArgs(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object")
        return parsed as Record<string, unknown>;
    } catch {
      // fall through
    }
  }
  return {};
}

function toGeminiTools(tools: OpenAiTool[]) {
  if (!tools || tools.length === 0) return undefined;
  const functionDeclarations = tools
    .map((t) => t.function)
    .filter((fn) => fn && fn.name);
  if (functionDeclarations.length === 0) return undefined;
  return [
    {
      functionDeclarations: functionDeclarations.map((fn) => ({
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters,
      })),
    },
  ];
}

function toGeminiRequest(messages: OpenAiMessage[], tools: OpenAiTool[]) {
  let systemInstructionText = "";
  const contents: GeminiContent[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      const text = normalizeTextContent(msg.content).trim();
      if (text) {
        systemInstructionText = systemInstructionText
          ? `${systemInstructionText}\n${text}`
          : text;
      }
      continue;
    }

    if (msg.role === "tool") {
      const text = normalizeTextContent(msg.content);
      const name = msg.name || "tool";
      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name,
              response: { content: text },
            },
          },
        ],
      });
      continue;
    }

    const role: "user" | "model" = msg.role === "assistant" ? "model" : "user";
    const parts: GeminiPart[] = [];

    const text = normalizeTextContent(msg.content);
    if (text) parts.push({ text });

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      for (const call of msg.tool_calls) {
        const fn = call.function;
        const name = fn?.name || call.name;
        if (!name) continue;
        const args = parseFunctionArgs(fn?.arguments ?? call.args);
        parts.push({ functionCall: { name, args } });
      }
    }

    if (parts.length > 0) {
      contents.push({ role, parts });
    }
  }

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  if (systemInstructionText) {
    body.systemInstruction = { parts: [{ text: systemInstructionText }] };
  }

  const geminiTools = toGeminiTools(tools);
  if (geminiTools) {
    body.tools = geminiTools;
    body.toolConfig = { functionCallingConfig: { mode: "AUTO" } };
  }

  return body;
}

function fromGeminiResponse(resp: any) {
  const candidate = resp?.candidates?.[0];
  const parts: GeminiPart[] = candidate?.content?.parts ?? [];
  let text = "";
  const toolCalls: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }> = [];
  let idx = 0;

  for (const part of parts) {
    if (part?.text) text += part.text;
    if (part?.functionCall?.name) {
      let args = "{}";
      try {
        args = JSON.stringify(part.functionCall.args ?? {});
      } catch {
        args = "{}";
      }
      toolCalls.push({
        id: `call_${idx++}`,
        type: "function",
        function: {
          name: part.functionCall.name,
          arguments: args,
        },
      });
    }
  }

  const message: any = {
    role: "assistant",
    content: text || "",
  };
  if (toolCalls.length > 0) message.tool_calls = toolCalls;

  return { choices: [{ message }] };
}

export async function runDeepWikiAgent(
  cwd: string,
  opts?: {
    systemPrompt?: string;
    extensions?: string[];
    priorReport?: string;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  },
) {
  const apiKey = opts?.apiKey;
  if (!apiKey) throw new Error("apiKey is required ❌");

  const baseUrl = opts?.baseUrl;
  if (!baseUrl) throw new Error("baseUrl is required ❌");

  const model = opts?.model;
  if (!model) throw new Error("model is required ❌");

  const endpoint = baseUrl.includes("{model}")
    ? baseUrl.replace("{model}", encodeURIComponent(model))
    : baseUrl;

  const client = {
    chat: async (request: {
      model: string;
      messages: OpenAiMessage[];
      tools: OpenAiTool[];
    }) => {
      const body = toGeminiRequest(request.messages, request.tools);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Gemini generateContent error ${res.status}: ${text}`);
      }
      const json = await res.json();
      return fromGeminiResponse(json);
    },
  };

  const agentArgs: {
    cwd: string;
    systemPrompt: string;
    extensions?: string[];
    priorReport?: string;
    client: typeof client;
    model: string;
    tools: {
      listDirectory: typeof listDirectoryTool;
      readFile: typeof readFileTool;
      renderMermaid: typeof renderMermaidTool;
    };
  } = {
    cwd,
    systemPrompt: opts?.systemPrompt?.trim() || "",
    client,
    model,
    tools: {
      listDirectory: listDirectoryTool,
      readFile: readFileTool,
      renderMermaid: renderMermaidTool,
    },
  };

  if (opts?.extensions && opts.extensions.length > 0) {
    agentArgs.extensions = opts.extensions;
  }

  if (opts?.priorReport?.trim()) {
    agentArgs.priorReport = opts.priorReport;
  }

  return await runAgent(agentArgs as unknown as Parameters<typeof runAgent>[0]);
}
