import { listDirectoryTool, readFileTool, renderMermaidTool } from "../tools/index.js";
import { createChatCompletionsClient } from "../chatCompletionsClient.js";
import { runAgent } from "../run.js";

export async function runDeepWikiAgent(
  cwd: string,
  opts?: {
    systemPrompt?: string;
    extensions?: string[];
    priorReport?: string;
    // overrides from selected config
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  }
) {
  const apiKey = opts?.apiKey;
  if (!apiKey) throw new Error("apiKey is required ❌");

  const baseUrl = opts?.baseUrl;
  if (!baseUrl) throw new Error("baseUrl is required ❌");

  const model = opts?.model;
  if (!model) throw new Error("model is required ❌");

  const client = createChatCompletionsClient({ apiKey, baseUrl });

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

  if (opts?.priorReport && opts.priorReport.trim()) {
    agentArgs.priorReport = opts.priorReport;
  }

  return await runAgent(agentArgs as any);
}

