<p align="center">
  <h1 align="center">litewiki</h1>
  <p align="center">一个 local-first 的 CLI：为你的代码库生成 wiki 风格的技术报告。</p>
</p>

<p align="center">
  <a href="https://github.com/CoderSerio/light-wiki"><img alt="repo" src="https://img.shields.io/badge/github-CoderSerio%2Flight--wiki-181717?logo=github&logoColor=white"></a>
  <a href="https://github.com/CoderSerio/light-wiki/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/badge/license-ISC-blue"></a>
  <a href="https://github.com/CoderSerio/light-wiki/issues"><img alt="issues" src="https://img.shields.io/github/issues/CoderSerio/light-wiki"></a>
  <a href="https://github.com/CoderSerio/light-wiki/stargazers"><img alt="stars" src="https://img.shields.io/github/stars/CoderSerio/light-wiki"></a>
  <img alt="typescript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white">
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white">
</p>

<p align="center">
  <a href="./README.md">English README</a>
</p>

## 功能特性

- **交互式 CLI**：直接运行 `wiki` 进入主菜单（`run`/`report`/`profile`/`config`）。
- **本地归档**：生成的报告会存到你的用户配置目录下。
- **增量模式**：可把上一次报告作为输入进行二次生成。
- **工具驱动 Agent**：通过工具探索仓库（`listDirectory`、`readFile`、`renderMermaid`）。

## 安装

要求：
- Node.js（ESM）
- pnpm（推荐）

全局安装：

```bash
npm i -g litewiki
# 或
pnpm add -g litewiki
```

然后运行：

```bash
wiki
```

## 本地开发安装

```bash
pnpm install
pnpm build
```

运行：

```bash
pnpm -s build
node dist/index.js
```

也可以本地全局 link（可选）：

```bash
pnpm link --global
wiki
```

## 快速开始

1) 创建 AI 配置：

```bash
wiki config
```

会提示你输入：
- `provider`: `openai | anthropic | google | custom`（**目前 `openai` 与 `anthropic` 可用**）
- `model`
- `baseUrl`
- `key`

2) 运行：

```bash
wiki run .
```

## Provider 说明

我们将 provider 抹平成：

```ts
provider: "openai" | "anthropic" | "google" | "custom"
```

- **已支持**：`openai`、`anthropic`
- **暂未支持（UI 里可以选，但运行会提示 Not supported yet）**：`google`、`custom`
- **Anthropic 说明**：使用 Messages API；`baseUrl` 请设置为 `https://api.anthropic.com/v1/messages`。

更多差异说明见：[`docs/providers.md`](./docs/providers.md)

## 命令

- `wiki`：交互式主菜单
- `wiki run [dir]`：分析目录
- `wiki profiles`：管理 Prompt Profile
- `wiki reports`：查看/删除归档报告
- `wiki config`：管理 AI 配置

## 开发

```bash
pnpm test
pnpm lint
pnpm format
pnpm build
pnpm dev
```

## Agent 指南

如果你在用 Cursor/Copilot 等 coding agent，请看：[`AGENTS.md`](./AGENTS.md)

## License

ISC © Carbon