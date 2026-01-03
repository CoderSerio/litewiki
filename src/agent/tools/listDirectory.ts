import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { ToolResult } from "../types.js";

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

const listDirectoryParams = z.object({
  relativeOriginalPath: z.string(),
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

  const parsed = listDirectoryParams.safeParse(args);
  if (!parsed.success) {
    toolResults.push({
      tool: "listDirectory",
      data: `invalid args`,
    } as any);
    return;
  }

  const targetPath = path.resolve(cwd, parsed.data.relativeOriginalPath);
  if (!targetPath.startsWith(cwd)) {
    toolResults.push({
      tool: "listDirectory",
      data: `非法路径访问`,
    } as any);
    return;
  }

  try {
    const items = await fs.readdir(targetPath, { withFileTypes: true });
    const data = items.map((item) => ({
      name: item.name,
      type: item.isDirectory() ? "directory" : "file",
    }));
    toolResults.push({ tool: "listDirectory", data });
    messages.push({
      role: "tool",
      tool_call_id: call.id ?? "",
      name: "listDirectory",
      content: JSON.stringify(data),
    });
  } catch (err: any) {
    const msgText =
      err && err.code === "ENOENT"
        ? `目录不存在: ${parsed.data.relativeOriginalPath}`
        : `读取失败: ${String(err)}`;
    toolResults.push({ tool: "listDirectory", data: msgText } as any);
    messages.push({
      role: "tool",
      tool_call_id: call.id ?? "",
      name: "listDirectory",
      content: msgText,
    });
  }
};

export const listDirectoryTool = {
  meta: {
    type: "function",
    function: {
      name: "listDirectory",
      description: "列出指定目录下的文件和文件夹",
      parameters: listDirectorySchema,
      strict: false,
    },
  },
  handler,
};
