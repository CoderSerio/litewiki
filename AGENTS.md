# AGENTS.md

This file is for **coding agents** (Cursor, Copilot, Claude Code, etc.).  
It complements `README.md` (for humans) with **actionable rules**: how to build, test, and change code safely.

References:
- [agents.md](https://agents.md/)

## Project Overview

`litewiki` is a local-first TypeScript CLI (`wiki`) that generates and archives wiki-style reports for a codebase.

Key areas:
- `src/cli/`: CLI entry + interactive flows (`run`, `report`, `profile`, `config`)
- `src/agent/`: tool-using agent loop + provider router
- `src/services/`: config persistence (stored under user config directory)
- `docs/`: design notes and provider matrix

## Commands (copy/paste)

```bash
pnpm install
pnpm test
pnpm build
pnpm lint
pnpm format
```

## Runtime Commands

```bash
wiki
wiki run .
wiki config
wiki profiles
wiki reports
```

## Provider Rules (IMPORTANT)

Provider is intentionally flattened to:

```ts
provider: "openai" | "anthropic" | "google" | "custom"
```

- Only **`openai`** is implemented right now.
- Selecting others should show a clear **Not supported yet** message.

Source of truth:
- Provider catalog: `src/agent/providers/providerCatalog.ts`
- Provider router: `src/agent/providers/index.ts`

### Legacy compatibility

Older values (e.g. `openai-chat-completions`) must be normalized via `normalizeProviderId()` (in `providerCatalog.ts`).

## Config Rules (IMPORTANT)

AI config is required and must include:
- `provider`
- `model`
- `baseUrl` (**required**)
- `key` (**required**)

Do not reintroduce provider-specific env defaults (e.g. `SILICONFLOW_*`). Keep configuration explicit.

## Code Conventions

- **Barrel exports**: every directory under `src/` should have an `index.ts` (keep it updated when moving files).
- **No test hooks in business code**: do not add globals or invasive hooks to control CLI/UI for tests.
- **TypeScript**: keep types strict; prefer Zod schemas for persisted JSON.
- **No secrets**: never commit API keys, tokens, or personal data.

## Testing Guidance

Unit tests should:
- Avoid network calls
- Avoid real LLM calls (no paid requests)
- Prefer temp directories + `LITEWIKI_HOME` override for isolation

Run:

```bash
pnpm test
```

## When Adding a New Provider

Minimum checklist:
- Update `src/agent/providers/providerCatalog.ts`:
  - add/adjust provider entry and messages
  - update `normalizeProviderId()` if needed
- Implement routing in `src/agent/providers/index.ts`
- Add/adjust client + response normalization (do not assume `choices[].message` if API shape differs)
- Add tests that do **not** hit real APIs
- Update `docs/providers.md` and `README*`