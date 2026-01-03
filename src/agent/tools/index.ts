import { listDirectoryTool } from "./listDirectory.js";
import { readFileTool } from "./readFile.js";

export { listDirectoryTool } from "./listDirectory.js";
export { readFileTool } from "./readFile.js";
export type { ToolResult } from "./types.js";

export const tools = {
  listDirectory: listDirectoryTool,
  readFile: readFileTool,
};
