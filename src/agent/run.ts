import type { ChatCompletionsClient } from "./chatCompletionsClient.js";
import { parseToolCalls } from "./parseToolCalls.js";
import type { ToolResult } from "./types.js";

type ToolCallLike = {
  id?: string;
  name?: string;
  args?: unknown;
  function?: { name?: string; arguments?: unknown };
};

type MessageLike = {
  role: "system" | "user" | "assistant" | "tool";
  content?: unknown;
  reasoning_content?: string;
  tool_calls?: ToolCallLike[];
};

export type AgentTools = {
  listDirectory: {
    meta: unknown;
    handler(props: {
      toolResults: ToolResult[];
      args: Record<string, unknown>;
      messages: MessageLike[];
      cwd: string;
      call: ToolCallLike;
    }): Promise<void>;
  };
  readFile: {
    meta: unknown;
    handler(props: {
      toolResults: ToolResult[];
      args: Record<string, unknown>;
      messages: MessageLike[];
      cwd: string;
      call: ToolCallLike;
    }): Promise<void>;
  };
  renderMermaid: {
    meta: unknown;
    handler(props: {
      toolResults: ToolResult[];
      args: Record<string, unknown>;
      messages: MessageLike[];
      cwd: string;
      call: ToolCallLike;
    }): Promise<void>;
  };
};

export async function runAgent(props: {
  cwd: string;
  systemPrompt: string;
  extensions?: string[];
  client: ChatCompletionsClient;
  model: string;
  tools: AgentTools;
  maxIterations?: number;
  priorReport?: string;
}) {
  const {
    cwd,
    systemPrompt,
    extensions,
    client,
    model,
    tools,
    maxIterations = 10,
    priorReport,
  } = props;

  const sys = [
    systemPrompt.trim(),
    ...(extensions?.length ? ["", ...extensions] : []),
  ]
    .filter(Boolean)
    .join("\n");

  const messages: MessageLike[] = [
    { role: "system", content: sys },
    {
      role: "user",
      content: `分析目录: ${cwd}。请先列根目录，然后按需阅读关键文件，最后给出总结。`,
    },
  ];

  if (priorReport?.trim()) {
    messages.push({
      role: "user",
      content: `这是上次生成的报告（用于增量更新参考）：\n\n${priorReport}`,
    });
  }

  const toolsMetaBase = [
    tools.listDirectory.meta,
    tools.readFile.meta,
    tools.renderMermaid.meta,
  ];

  for (let i = 0; i < maxIterations; i++) {
    if (i === maxIterations - 2) {
      messages.push({
        role: "user",
        content:
          "请基于已经查看的信息，给出项目结构的最终总结。不要再调用工具。",
      });
    }

    // Force convergence: in the last 2 iterations, disallow tools.
    const allowTools = i < maxIterations - 2;
    const toolsMeta = allowTools ? toolsMetaBase : [];

    const resp = (await client.chat({
      model,
      messages: messages as unknown as any,
      tools: toolsMeta as unknown as any,
    })) as any;
    const choice = resp?.choices?.[0];
    const msg = choice?.message as MessageLike | undefined;
    if (!msg) throw new Error("Empty response from model");

    const parsedFromReasoning = parseToolCalls(msg.reasoning_content);
    const toolCalls = msg.tool_calls || parsedFromReasoning;

    if (!toolCalls || toolCalls.length === 0) {
      if (msg.content) {
        if (typeof msg.content === "string") return msg.content;
        if (Array.isArray(msg.content)) {
          return msg.content
            .map((c) =>
              typeof (c as { text?: unknown } | null)?.text === "string"
                ? (c as { text: string }).text || ""
                : "",
            )
            .join("\n");
        }
        return String(msg.content);
      }
      throw new Error(
        `No tool calls and no content. Raw response: ${JSON.stringify(resp)}`,
      );
    }

    const toolResults: ToolResult[] = [];

    for (const call of toolCalls as ToolCallLike[]) {
      const name = call.function?.name ?? call.name;
      const argsRaw = call.function?.arguments ?? call.args;
      if (!name) {
        toolResults.push({ tool: "readFile", data: "unknown tool: (empty)" });
        continue;
      }

      let args: Record<string, unknown> = {};
      try {
        if (typeof argsRaw === "string") {
          args = (JSON.parse(argsRaw) || {}) as Record<string, unknown>;
        } else if (argsRaw && typeof argsRaw === "object") {
          args = argsRaw as Record<string, unknown>;
        } else {
          args = {};
        }
      } catch (e) {
        toolResults.push({
          tool: "readFile",
          data: `args parse error: ${String(e)}`,
        });
        continue;
      }

      const tool = (tools as unknown as Record<string, any>)[name];
      if (!tool || typeof tool.handler !== "function") {
        toolResults.push({
          tool: "readFile",
          data: `unknown tool: ${String(name)}`,
        });
        continue;
      }

      await tool.handler({ toolResults, args, messages, cwd, call });
    }

    // 只有标准 tool_calls 才能塞回 messages 让模型维持结构
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      messages.push({
        role: "assistant",
        content: msg.content ?? "",
        tool_calls: msg.tool_calls as unknown as ToolCallLike[],
      });
    }
  }

  const last = messages[messages.length - 1];
  const lastContent =
    last && typeof last.content === "string" ? last.content.slice(0, 400) : "";
  throw new Error(
    `工具循环未得到最终答案 (maxIterations=${maxIterations}). last=${lastContent}`,
  );
}
