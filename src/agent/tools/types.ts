export type ToolResult =
  | { tool: "listDirectory"; data: { name: string; type: string }[] }
  | { tool: "readFile"; data: string };
