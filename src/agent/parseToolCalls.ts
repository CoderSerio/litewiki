type ParsedToolCall = {
  id?: string;
  name: string;
  args: Record<string, string>;
};

export function parseToolCalls(
  reasoningContent: string | undefined
): ParsedToolCall[] {
  if (!reasoningContent) return [];

  const results: ParsedToolCall[] = [];
  const regex = /<tool_call>([\s\S]*?)<\/tool_call>/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(reasoningContent)) !== null) {
    const block = match[1] ?? "";
    const nameMatch = block.match(/^([^\n<]+)/);
    const name = nameMatch && nameMatch[1] ? nameMatch[1].trim() : "";

    const argRegex =
      /<arg_key>([\s\S]*?)<\/arg_key><arg_value>([\s\S]*?)<\/arg_value>/g;
    const args: Record<string, string> = {};
    let argMatch: RegExpExecArray | null;
    while ((argMatch = argRegex.exec(block)) !== null) {
      const k = argMatch[1] ?? "";
      const v = argMatch[2] ?? "";
      args[k.trim()] = v.trim();
    }

    if (name) results.push({ name, args });
  }

  return results;
}
