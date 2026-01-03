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
