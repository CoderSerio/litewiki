import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

// TODO: Shit，I forget that it's a command line tool, so it'd reconsider a better way to manage env variables
const API_KEY = process.env.SILICONFLOW_API_KEY;
const BASE_URL = "https://api.siliconflow.cn/v1/chat/completions";
const MODEL = "Pro/zai-org/GLM-4.7"; // 文档示例模型

// console.log("API_KEY !\n", API_KEY?.slice(0, 10));
if (!API_KEY) {
  throw new Error("SILICONFLOW_API_KEY is not set ❌");
}

//  JSON Schema，But notice that SiliconFlow needs JSON Schema instead of zod object
const listDirectorySchema = {
  type: "object",
  properties: {
    relativeOriginalPath: {
      type: "string",
      description: "相对于起始目录的路径，空字符串表示根目录",
    },
  },
  required: ["relativeOriginalPath"],
  additionalProperties: false,
} as const;

const readFileSchema = {
  type: "object",
  properties: {
    relativeFilePath: {
      type: "string",
      description: "相对于起始目录的文件路径，例如 README.md",
    },
  },
  required: ["relativeFilePath"],
  additionalProperties: false,
} as const;

// Still use zod for runtime validation (more friendly)
const listDirectoryParams = z.object({
  relativeOriginalPath: z.string(),
});

const readFileParams = z.object({
  relativeFilePath: z.string(),
});

type ToolResult =
  | { tool: "listDirectory"; data: { name: string; type: string }[] }
  | { tool: "readFile"; data: string };

type ParsedToolCall = {
  id?: string;
  name: string;
  args: Record<string, string>;
};

function parseToolCalls(
  reasoningContent: string | undefined
): ParsedToolCall[] {
  if (!reasoningContent) return [];
  const results: ParsedToolCall[] = [];
  const regex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
  let match;
  while ((match = regex.exec(reasoningContent)) !== null) {
    const block = match[1] ?? "";
    const nameMatch = block.match(/^([^\n<]+)/);
    const name = nameMatch && nameMatch[1] ? nameMatch[1].trim() : "";
    const argRegex =
      /<arg_key>([\s\S]*?)<\/arg_key><arg_value>([\s\S]*?)<\/arg_value>/g;
    const args: Record<string, string> = {};
    let argMatch;
    while ((argMatch = argRegex.exec(block)) !== null) {
      const k = argMatch[1] ?? "";
      const v = argMatch[2] ?? "";
      args[k.trim()] = v.trim();
    }
    if (name) results.push({ name, args });
  }
  return results;
}

async function callChat(messages: any[]) {
  const body = {
    model: MODEL,
    messages,
    stream: false,
    temperature: 0.7,
    max_tokens: 4096,
    tool_choice: "auto",
    response_format: { type: "text" },
    tools: [
      {
        type: "function",
        function: {
          name: "listDirectory",
          description: "列出指定目录下的文件和文件夹",
          parameters: listDirectorySchema,
          strict: false,
        },
      },
      {
        type: "function",
        function: {
          name: "readFile",
          description: "读取指定文件的内容（最多返回 5000 字符）",
          parameters: readFileSchema,
          strict: false,
        },
      },
    ],
  };

  // console.log("[agent] request body =>", JSON.stringify(body, null, 2));

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SiliconFlow error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function runDeepWikiAgent(cwd: string) {
  console.log("[agent] start", cwd);

  const messages: any[] = [
    {
      role: "system",
      content:
        "你是一个项目分析专家，使用工具查看目录和文件后给出项目结构总结。规则：1) 先 listDirectory('') 看根目录再决定读取；2) 只读取存在的文件，若不存在请换一个；3) 先看 package.json，再看 README*，然后看 src/ 里的入口文件；4) 总结时明确入口、主要命令和关键文件。",
    },
    {
      role: "user",
      content: `分析目录: ${cwd}。请先列根目录，然后按需阅读关键文件，最后给出总结。`,
    },
  ];

  const maxIterations = 10;
  for (let i = 0; i < maxIterations; i++) {
    // 如果接近上限，提示模型给出最终答案
    if (i === maxIterations - 2) {
      messages.push({
        role: "user",
        content:
          "请基于已经查看的信息，给出项目结构的最终总结。不要再调用工具。",
      });
    }

    const resp = await callChat(messages);
    const choice = resp.choices?.[0];
    const msg = choice?.message;
    if (!msg) throw new Error("Empty response from model");

    // 从 reasoning_content 中解析工具调用（模型没有按 tool_calls 返回）
    const parsedFromReasoning = parseToolCalls(msg.reasoning_content);

    // 处理工具调用
    const toolCalls = msg.tool_calls || parsedFromReasoning;
    if (toolCalls.length === 0) {
      // 无工具调用，直接返回最终内容
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

    for (const call of toolCalls) {
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

      if (name === "listDirectory") {
        const parsed = listDirectoryParams.safeParse(args);
        if (!parsed.success) {
          toolResults.push({
            tool: "listDirectory",
            data: `invalid args`,
          } as any);
          continue;
        }
        const targetPath = path.resolve(cwd, parsed.data.relativeOriginalPath);
        if (!targetPath.startsWith(cwd)) {
          toolResults.push({
            tool: "listDirectory",
            data: `非法路径访问`,
          } as any);
          continue;
        }
        const items = await fs.readdir(targetPath, { withFileTypes: true });
        const data = items.map((item) => ({
          name: item.name,
          type: item.isDirectory() ? "directory" : "file",
        }));
        toolResults.push({ tool: "listDirectory", data });
        messages.push({
          role: "tool",
          tool_call_id: (call as any).id ?? "",
          name,
          content: JSON.stringify(data),
        });
        continue;
      }

      if (name === "readFile") {
        const parsed = readFileParams.safeParse(args);
        if (!parsed.success) {
          toolResults.push({ tool: "readFile", data: `invalid args` } as any);
          continue;
        }
        const targetPath = path.resolve(cwd, parsed.data.relativeFilePath);
        if (!targetPath.startsWith(cwd)) {
          toolResults.push({ tool: "readFile", data: `非法路径访问` } as any);
          continue;
        }
        try {
          const content = await fs.readFile(targetPath, "utf-8");
          const clipped =
            content.length > 5000
              ? content.slice(0, 5000) + "\n...(内容已截断)"
              : content;
          toolResults.push({ tool: "readFile", data: clipped });
          messages.push({
            role: "tool",
            tool_call_id: (call as any).id ?? "",
            name,
            content: clipped,
          });
        } catch (err: any) {
          const msgText =
            err && err.code === "ENOENT"
              ? `文件不存在: ${parsed.data.relativeFilePath}`
              : `读取失败: ${String(err)}`;
          toolResults.push({ tool: "readFile", data: msgText });
          messages.push({
            role: "tool",
            tool_call_id: (call as any).id ?? "",
            name,
            content: msgText,
          });
        }
        continue;
      }
    }

    // 将 assistant 的工具调用消息也加入对话
    // 但只有标准格式的 tool_calls 才能放入 messages（从 msg.tool_calls 来的）
    // 从 reasoning_content 解析的格式不符合标准，不能直接放入
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
