# Project — Handoff

> **How to maintain this file**
> Current-state snapshot, read at the start of a session. Update after sessions that change architecture, add or remove features, resolve open questions, or shift priorities — not every session.
> — **Do not duplicate content held elsewhere.** Specs, plans, TODO/DONE docs, commits and diffs are referenced by path, never summarised here.
> — **Do not record derivable facts.** No version numbers, no dates, no counts — they go stale silently and nothing forces them current. Derive them when needed.
> — Write in present tense. Describe what exists, not how it works. No code snippets.
> — Budgets: Architecture ≤ 60 lines, Key Decisions ≤ 15 items, every other section ≤ 20 lines. **When a section is over budget, cut detail before you cut items** — losing an entry is worse than losing its explanation. An Architecture entry needing more than ~5 lines has outgrown this file: write a spec and leave a pointer.
> — Retire Key Decisions once they are no longer questioned, or are already stated in `AGENTS.md`.
> — Tag every Open Work item with exactly one of `[in flight <branch>]`, `[verified, uncommitted]`, `[open PR #N]`, `[planned, not started]`, `[blocked: <what>]`. An untagged item is not done — so tag it.
> — Redact secrets, tokens, and personal data. This file is tracked in git.
> — `.agents/memory.md` = chronological working memory / session log. `.agents/handoff.md` = current project state snapshot. See `docs/process/PROJECT_MEMORY_MODEL.md`.

## Capsule

- Shared building blocks for local-first macOS apps (cover-kit, LLAAB, and future local apps).
- First module: persisted UI state. Released; used by cover-kit's library layout.

## Architecture

- `src/index.ts` — browser-safe root: shared types and key rules (`src/shared/`). Never imports `node:` or React.
- `src/ui-state/` → `./ui-state` — Node store (one JSON file) and a Web `Request → Response` handler.
- `src/react/` → `./react` — `usePersistedUiState` on `useSyncExternalStore` with a per-URL module cache.
- One tsdown entry per subpath; `package.json` `exports` is hand-written (`exports: false` in tsdown).

## Status

- UI state module complete with tests; usage and API documented in `README.md`.

## Key Decisions

- React is an optional peer; the hook uses plain `fetch` (no TanStack Query), matching `@finografic/react`'s zero-dependency rule.
- The handler is framework-free (Web standard) so apps on Hono, Bun or Next mount it in one line.
- File format matches LLAAB's `configs/ui-state.json`, so LLAAB migrates without converting data.
- The JSON file belongs to the consuming app's data folder and is gitignored there.

## Open Work

- Adoption in LLAAB [planned, not started]

## Next Move

Switch LLAAB's local `routes/ui-state` and `useUiState.ts` to this package.

## Suggested Skills

_None specific._
