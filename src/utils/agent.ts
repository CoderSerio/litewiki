export const IsPathSafe = (props: {
  safeRange: string;
  targetPath: string;
}) => {
  const { safeRange, targetPath } = props;
  if (!targetPath.startsWith(safeRange)) {
    return false;
  }
  return true;
};

export function normalizeMarkdown(input: string) {
  // minimum processing: ensure ends with a newline, avoid sticking when concatenating/saving
  const s = String(input ?? "");
  if (s.endsWith("\n")) return s;
  return s + "\n";
}
