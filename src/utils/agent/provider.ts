import { createOpenAI } from "@ai-sdk/openai"; // 引入工厂函数
import { generateText } from "ai";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

// 1. 先创建一个自定义的 Provider 实例
const siliconCloudProvider = createOpenAI({
  apiKey: process.env.SILICONFLOW_API_KEY || "",
  baseURL: "https://api.siliconflow.cn/v1",
});

// 2. 使用该实例获取指定的模型
const model = siliconCloudProvider("deepseek-ai/DeepSeek-V3");

export async function runDeepWikiAgent(cwd: string) {
  const tools = {
    listDirectory: {
      description: "列出指定目录下的文件和文件夹",
      parameters: z.object({
        relativeOriginalPath: z
          .string()
          .describe("相对于起始目录的路径，空字符串表示根目录"),
      }),
      execute: async ({
        relativeOriginalPath,
      }: {
        relativeOriginalPath: string;
      }) => {
        const targetPath = path.resolve(cwd, relativeOriginalPath);
        // 安全检查：防止越界访问
        if (!targetPath.startsWith(cwd)) {
          throw new Error("非法路径访问");
        }
        const items = await fs.readdir(targetPath, { withFileTypes: true });
        return items.map((item) => ({
          name: item.name,
          type: item.isDirectory() ? "directory" : "file",
        }));
      },
    },
    readFile: {
      description: "读取指定文件的内容（最多返回 5000 字符）",
      parameters: z.object({
        relativeFilePath: z
          .string()
          .describe("相对于起始目录的文件路径，例如 README.md"),
      }),
      execute: async ({ relativeFilePath }: { relativeFilePath: string }) => {
        const targetPath = path.resolve(cwd, relativeFilePath);
        if (!targetPath.startsWith(cwd)) {
          throw new Error("非法路径访问");
        }
        const content = await fs.readFile(targetPath, "utf-8");
        return content.length > 5000
          ? content.slice(0, 5000) + "\n...(内容已截断)"
          : content;
      },
    },
  } as const;

  // streamText or generateText
  const result = await generateText({
    model: model, // 这里传入上面创建的模型实例
    system: `你是一个项目分析专家...`,
    prompt: `分析目录: ${cwd}`,
    tools: tools as any, // 简化类型约束，保证 SDK 工具调用正常
  });

  return result.text;
}
