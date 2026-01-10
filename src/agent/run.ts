import type { ToolResult } from "./types.js";
import type { SiliconFlowClient } from "./siliconflowClient.js";
import { parseToolCalls } from "./parseToolCalls.js";

type AnyToolCall = any;
type AnyMessage = any;

export type AgentTools = {
  listDirectory: {
    meta: any;
    handler(props: {
      toolResults: ToolResult[];
      args: Record<string, any>;
      messages: AnyMessage[];
      cwd: string;
      call: AnyToolCall;
    }): Promise<void>;
  };
  readFile: {
    meta: any;
    handler(props: {
      toolResults: ToolResult[];
      args: Record<string, any>;
      messages: AnyMessage[];
      cwd: string;
      call: AnyToolCall;
    }): Promise<void>;
  };
};

export async function runAgent(props: {
  cwd: string;
  systemPrompt: string;
  extensions?: string[];
  client: SiliconFlowClient;
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

  const messages: AnyMessage[] = [
    { role: "system", content: sys },
    {
      role: "user",
      content: `分析目录: ${cwd}。请先列根目录，然后按需阅读关键文件，最后给出总结。`,
    },
  ];

  if (priorReport && priorReport.trim()) {
    messages.push({
      role: "user",
      content: `这是上次生成的报告（用于增量更新参考）：\n\n${priorReport}`,
    });
  }

  const toolsMeta = [tools.listDirectory.meta, tools.readFile.meta];

  for (let i = 0; i < maxIterations; i++) {
    if (i === maxIterations - 2) {
      messages.push({
        role: "user",
        content:
          "请基于已经查看的信息，给出项目结构的最终总结。不要再调用工具。",
      });
    }

    const resp = await client.chat({ model, messages, tools: toolsMeta });
    const choice = resp.choices?.[0];
    const msg = choice?.message;
    if (!msg) throw new Error("Empty response from model");

    const parsedFromReasoning = parseToolCalls(msg.reasoning_content);
    const toolCalls = msg.tool_calls || parsedFromReasoning;

    if (!toolCalls || toolCalls.length === 0) {
      if (msg.content) {
        return typeof msg.content === "string"
          ? msg.content
          : msg.content.map((c: any) => c.text || "").join("\n");
      }
      throw new Error(
        `No tool calls and no content. Raw response: ${JSON.stringify(resp)}`
      );
    }

    const toolResults: ToolResult[] = [];

    for (const call of toolCalls as AnyToolCall[]) {
      const name = "function" in call ? call.function?.name : call.name;
      const argsRaw = "function" in call ? call.function?.arguments : call.args;

      let args: any = {};
      try {
        args =
          typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw || {};
      } catch (e) {
        toolResults.push({
          tool: name,
          data: `args parse error: ${String(e)}`,
        } as any);
        continue;
      }

      const tool = (tools as any)[name];
      if (!tool || typeof tool.handler !== "function") {
        toolResults.push({
          tool: name,
          data: `unknown tool: ${String(name)}`,
        } as any);
        continue;
      }

      await tool.handler({ toolResults, args, messages, cwd, call });
    }

    // 只有标准 tool_calls 才能塞回 messages 让模型维持结构
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      messages.push({
        role: "assistant",
        content: msg.content ?? "",
        tool_calls: msg.tool_calls,
      });
    }
  }

  throw new Error("工具循环未得到最终答案");
}
