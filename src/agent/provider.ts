import { listDirectoryTool, readFileTool } from "./tools/index.js";
import { createSiliconFlowClient } from "./siliconflowClient.js";
import { runAgent } from "./run.js";

const DEFAULT_BASE_URL = "https://api.siliconflow.cn/v1/chat/completions";
const DEFAULT_MODEL = "Pro/zai-org/GLM-4.7";

export async function runDeepWikiAgent(
  cwd: string,
  opts?: {
    systemPrompt?: string;
    extensions?: string[];
    priorReport?: string;
  }
) {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) throw new Error("SILICONFLOW_API_KEY is not set ❌");

  const baseUrl = process.env.SILICONFLOW_BASE_URL || DEFAULT_BASE_URL;
  const model = process.env.SILICONFLOW_MODEL || DEFAULT_MODEL;

  const client = createSiliconFlowClient({ apiKey, baseUrl });

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
    };
  } = {
    cwd,
    systemPrompt: opts?.systemPrompt?.trim() || "",
    client,
    model,
    tools: {
      listDirectory: listDirectoryTool,
      readFile: readFileTool,
    },
  };

  if (opts?.extensions && opts.extensions.length > 0) {
    agentArgs.extensions = opts.extensions;
  }

  if (opts?.priorReport && opts.priorReport.trim()) {
    agentArgs.priorReport = opts.priorReport;
  }

  return await runAgent(agentArgs as any);
}
