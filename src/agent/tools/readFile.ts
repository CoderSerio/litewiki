import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { ToolResult } from "./types.js";

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

const readFileParams = z.object({
  relativeFilePath: z.string(),
});

type Message = any;
type ToolCall = any;

const handler = async (props: {
  toolResults: ToolResult[];
  args: Record<string, any>;
  messages: Message[];
  cwd: string;
  call: ToolCall;
}) => {
  const { toolResults, args, messages, cwd, call } = props;

  const parsed = readFileParams.safeParse(args);
  if (!parsed.success) {
    toolResults.push({ tool: "readFile", data: `invalid args` } as any);
    return;
  }

  const targetPath = path.resolve(cwd, parsed.data.relativeFilePath);
  if (!targetPath.startsWith(cwd)) {
    toolResults.push({ tool: "readFile", data: `非法路径访问` } as any);
    return;
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
      tool_call_id: call.id ?? "",
      name: "readFile",
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
      tool_call_id: call.id ?? "",
      name: "readFile",
      content: msgText,
    });
  }
};

export const readFileTool = {
  meta: {
    type: "function",
    function: {
      name: "readFile",
      description: "读取指定文件的内容（最多返回 5000 字符）",
      parameters: readFileSchema,
      strict: false,
    },
  },
  handler,
};
