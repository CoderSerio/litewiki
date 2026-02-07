# litewiki Roadmap (Ideas & Directions)

This is a living document collecting ambitious ideas for where litewiki could go. These are intentionally broad and speculative to encourage exploration.

## 1) Agentic Workflows (Devin/Cursor-class UX)
- Autonomous workflows: run multi-step plans (scan repo, propose fixes, open PRs, write docs) with human approval gates
- Goal-driven sessions: accept a high-level objective and generate a plan with milestones/tasks
- Inline PR iteration: read CI output, propose/code fixes, push commits until green
- Guardrails: dry-run mode, diffs-only mode, and “explain plan” before execution

## 2) First-class Editor Integrations
- VS Code/JetBrains/Neovim extensions: trigger “wiki run”, preview reports, jump-to-code from report
- Inline hover cards: show summaries/graphs for functions/types/dirs
- One-click “document this file/module” from editor context

## 3) Rich Knowledge Graphs
- Build a semantic graph (files ↔ symbols ↔ modules ↔ commits ↔ issues/PRs)
- Interactive visualizations (Mermaid/D3): dependency graphs, call graphs, ownership overlays
- Cross-repo views: organization-level knowledge map; detect reused patterns and anti-patterns

## 4) Advanced Report Types
- Design docs extraction: infer architecture views (C4), data flow, invariants, boundaries
- Test docs: summarize test coverage, flaky hotspots, dead tests, suggested new tests
- Security doc: secrets scanning (defensive only), risky patterns, dependency posture
- Release notes: summarize since last tag, user notable changes, migration impact

## 5) i18n and Localization at Scale
- Automatic language detection from repo metadata and contributors
- Multi-lingual reports with side-by-side toggle
- Community translation packs; crowdsource glossary per ecosystem (React, Rust, etc.)

## 6) Model & Runtime Flexibility
- Local/offline mode: support small local models (gguf) for private runs; hybrid fallback to cloud
- Provider mesh: choose best provider per subtask (summarization vs. code reasoning vs. graph)
- Cost-aware routing: budgets per run; offline cache + deduplication of unchanged chunks

## 7) Extensible Plugins (Safe by Default)
- WASM sandboxed plugins for analysis (no network by default; capability-scoped)
- Plugin categories: framework analyzers (Next.js, Django), language analyzers (Go, Rust), infra docs (Terraform)
- Plugin marketplace with signed manifests and reputation

## 8) Continuous Knowledge
- Watch mode: incremental re-analysis on changes; PR comment bot posts deltas
- Drift detection: code vs. docs divergence alerts; suggest updates as patch files
- Temporal views: how the architecture evolved over time, hotspots trending up/down

## 9) Collaboration & Review
- Shareable previews with private links; per-section comments that map back to code
- Suggested reviewers based on ownership graph and past contributions
- “Explain this diff” and “Summarize risk” for PRs

## 10) Education & Onboarding
- First-week onboarding pack: guided repo tour, glossary, key decisions, coding standards
- Skill maps for new contributors: starter issues, safe subsystems, mentored tasks

## 11) Performance & Scale
- Parallel crawl + chunk schedulers; memoized analysis with structural hashing
- Large monorepo strategies: partial runs by scope; repo-aware rate limits and caches

## 12) UX Experiments
- TUI dashboard: fuzzy search across report sections, symbol lookup, live graphs
- Web UI: progressive render of large reports; searchable across all past runs
- “Ask the Repo”: chat over report + code (retrieval grounded on indexed artifacts)

If any of these resonate, open an issue or a discussion. Contributions welcome! 🧭
