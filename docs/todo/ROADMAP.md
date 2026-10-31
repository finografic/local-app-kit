# Roadmap

> **This is the primary high-level plan for the project.**
> Check this file before proposing new work. Add new items when conceiving features.
> Keep it ordered by priority — move completed items to the Done section at the bottom.

---

## How to use this file

| Tier | Meaning                                   |
| ---- | ----------------------------------------- |
| P0   | Active — being worked on now              |
| P1   | Next — fully scoped, ready to start       |
| P2   | Planned — direction decided, detail TBD   |
| P3   | Backlog — good ideas, not yet prioritised |

When an item is done, move it to the Done section at the bottom with a completion date.

---

## Next

- [ ] First release (`release:github:minor` → 0.1.0) once the UI state module is reviewed.
- [ ] Adopt in cover-kit: replace the `localStorage` library layout with `usePersistedUiState('library.layout', …)`.
- [ ] Adopt in LLAAB: swap the local `routes/ui-state` + `useUiState.ts` for this package (same file format).

---

## P0 — Active

_Nothing active right now — pick from P1._

---

## P1 — Next Up

_No items yet._

---

## P2 — Planned

- **macOS file helpers from cover-kit** — move to Trash (`/usr/bin/trash`), Show in Finder, open in an app, debounced folder watcher. Extract once a second app needs them; source lives in cover-kit `apps/server/src/services/`.

---

## P3 — Backlog

_No items yet._

---

## Done

| Item                                                            | Completed  |
| --------------------------------------------------------------- | ---------- |
| Persisted UI state: Node store, Web handler, React hook, README | 2026-10-31 |
