import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

// TODO: 不对，我们是命令行，后面得考虑下怎么做更合适
const API_KEY = process.env.SILICONFLOW_API_KEY;
const BASE_URL = "https://api.siliconflow.cn/v1/chat/completions";
const MODEL = "Pro/zai-org/GLM-4.7"; // 文档示例模型

if (!API_KEY) {
  throw new Error("SILICONFLOW_API_KEY is not set ❌");
}

// 定义工具的参数 Schema（用于构造函数调用的 parameters）
const listDirectoryParams = z.object({
  relativeOriginalPath: z
    .string()
    .describe("相对于起始目录的路径，空字符串表示根目录"),
});

const readFileParams = z.object({
  relativeFilePath: z
    .string()
    .describe("相对于起始目录的文件路径，例如 README.md"),
});

type ToolResult =
  | { tool: "listDirectory"; data: { name: string; type: string }[] }
  | { tool: "readFile"; data: string };

async function callChat(messages: any[]) {
  const body = {
    model: MODEL,
    messages,
    stream: false,
    temperature: 0.7,
    tools: [
      {
        type: "function",
        function: {
          name: "listDirectory",
          description: "列出指定目录下的文件和文件夹",
          parameters: listDirectoryParams,
          strict: false,
        },
      },
      {
        type: "function",
        function: {
          name: "readFile",
          description: "读取指定文件的内容（最多返回 5000 字符）",
          parameters: readFileParams,
          strict: false,
        },
      },
    ],
  };

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
        "你是一个项目分析专家，使用工具查看目录和文件后给出项目结构总结。",
    },
    {
      role: "user",
      content: `分析目录: ${cwd}。请先列根目录，然后按需阅读关键文件，最后给出总结。`,
    },
  ];

  for (let i = 0; i < 8; i++) {
    const resp = await callChat(messages);
    const choice = resp.choices?.[0];
    const msg = choice?.message;
    if (!msg) throw new Error("Empty response from model");

    // 处理工具调用
    const toolCalls = msg.tool_calls || [];
    if (toolCalls.length === 0) {
      // 无工具调用，直接返回最终内容
      if (msg.content) {
        return typeof msg.content === "string"
          ? msg.content
          : msg.content.map((c: any) => c.text || "").join("\n");
      }
      throw new Error("No tool calls and no content");
    }

    const toolResults: ToolResult[] = [];

    for (const call of toolCalls) {
      const name = call.function?.name;
      const argsRaw = call.function?.arguments;
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
          tool_call_id: call.id,
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
        const content = await fs.readFile(targetPath, "utf-8");
        const clipped =
          content.length > 5000
            ? content.slice(0, 5000) + "\n...(内容已截断)"
            : content;
        toolResults.push({ tool: "readFile", data: clipped });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name,
          content: clipped,
        });
        continue;
      }
    }

    // 将 assistant 的工具调用消息也加入对话
    messages.push({
      role: "assistant",
      content: msg.content ?? "",
      tool_calls: toolCalls,
    });
  }

  throw new Error("工具循环未得到最终答案");
}
