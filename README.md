<p align="center">
  <h1 align="center">litewiki</h1>
  <p align="center">A local-first CLI that generates a wiki-style report for your codebase.</p>
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
  <a href="./README_ZH.md">中文 README</a>
</p>

## Features

- **Interactive CLI**: `wiki` opens a simple menu (`run`, `report`, `profile`, `config`).
- **Project archiving**: generated reports are saved under your user config directory.
- **Incremental mode**: can reuse the latest archived report as input.
- **Tool-using agent**: the agent explores your repo via tools (`listDirectory`, `readFile`, `renderMermaid`).

## Install

Requirements:
- Node.js (ESM)
- pnpm (recommended)

Install globally:

```bash
npm i -g litewiki
# or
pnpm add -g litewiki
```

Then run:

```bash
wiki
```

## Development Install

```bash
pnpm install
pnpm build
```

Then run the CLI:

```bash
pnpm -s build
node dist/index.js
```

Or link it locally (optional):

```bash
pnpm link --global
wiki
```

## Quick Start

1) Create an AI config:

```bash
wiki config
```

You will be asked for:
- `provider`: `openai | anthropic | google | custom` (**`openai` and `anthropic` work for now**)
- `model`
- `baseUrl`
- `key`

2) Run:

```bash
wiki run .
```

## Providers

We intentionally **flatten** providers to:

```ts
provider: "openai" | "anthropic" | "google" | "custom"
```

- **Supported**: `openai`, `anthropic`
- **Not supported yet (but selectable in UI)**: `google`, `custom`
- **Anthropic note**: uses the Messages API; set `baseUrl` to `https://api.anthropic.com/v1/messages`.

See: [`docs/providers.md`](./docs/providers.md)

## Commands

- `wiki`: interactive menu
- `wiki run [dir]`: analyze a directory
- `wiki profiles`: manage prompt profiles
- `wiki reports`: view/delete archived reports
- `wiki config`: manage AI configs

## Development

```bash
pnpm test
pnpm lint
pnpm format
pnpm build
pnpm dev
```

## Agent Guide

If you're using a coding agent (Cursor/Copilot/etc.), see: [`AGENTS.md`](./AGENTS.md)

## License

ISC © Carbon