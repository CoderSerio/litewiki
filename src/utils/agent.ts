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
  // 最小处理：确保以换行结尾，避免拼接/保存时粘连
  const s = String(input ?? "");
  if (s.endsWith("\n")) return s;
  return s + "\n";
}
