import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"], // 现代 CLI 推荐只输出 ESM
  dts: true, // 生成类型定义
  splitting: false,
  sourcemap: true,
  clean: true, // 每次构建前清理目录
  minify: false, // CLI 工具通常不需要压缩，方便调试
  shims: true, // 自动注入 ESM 缺失的 __dirname 等
});
