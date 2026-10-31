# @finografic/local-app-kit

> Building blocks for local-first apps on macOS: persisted UI state, filesystem and Finder helpers. Server and React entry points.

- **Persisted UI state** — view modes, filters, panel toggles that survive reloads and restarts, saved in one JSON file next to your app.
- **No framework lock-in** — the server side is a Web `Request → Response` handler (Hono, Bun, Next, …); the React hook needs no query library.
- **Small and typed** — zero runtime dependencies; React is an optional peer, needed only for `./react`.

## 📦 Installation

```bash
pnpm add @finografic/local-app-kit
```

The package is published to GitHub Packages; the consuming repo needs the `@finografic` registry in its `.npmrc` (see [`docs/process/GITHUB_PACKAGES_SETUP.md`](./docs/process/GITHUB_PACKAGES_SETUP.md)).

## 🧭 Entry Points

| Import                               | Runs in        | Contents                                       |
| ------------------------------------ | -------------- | ---------------------------------------------- |
| `@finografic/local-app-kit`          | anywhere       | Shared types, `isUiStateKey`, default endpoint |
| `@finografic/local-app-kit/ui-state` | Node (server)  | `createUiStateStore`, `createUiStateHandler`   |
| `@finografic/local-app-kit/react`    | browser, React | `usePersistedUiState`, `clearUiStateCache`     |

The root never imports `node:` modules or React, so it is safe in any bundle.

## 🚀 Quick Start — Persisted UI State

### 1. Server: store + route

```ts
import { resolve } from 'node:path';
import { createUiStateHandler, createUiStateStore } from '@finografic/local-app-kit/ui-state';

const uiStateStore = createUiStateStore({ filePath: resolve(projectRoot, 'data/ui-state.json') });
const uiState = createUiStateHandler(uiStateStore);

// Hono
app.all('/api/ui-state/:key', (c) => uiState(c.req.raw));
```

Any server that speaks Web `Request` / `Response` works the same way: pass the request in, return the response.

### 2. Client: the hook

```tsx
import { usePersistedUiState } from '@finografic/local-app-kit/react';

function LibraryPage() {
  const { value: layout, setValue: setLayout, isLoading } = usePersistedUiState('library.layout', {
    mode: 'grid',
    size: 'md',
  });

  if (isLoading) return null; // optional: avoids a flash of the default
  return <LayoutPicker layout={layout} onChange={setLayout} />;
}
```

### 3. Git

Add the JSON file to `.gitignore` — it holds one person's preferences, not project data:

```gitignore
data/ui-state.json
```

## 📖 API

### `createUiStateStore({ filePath })`

A key/value store kept in one pretty-printed JSON file.

| Method            | Result                                            |
| ----------------- | ------------------------------------------------- |
| `get(key)`        | the saved value, or `null`                        |
| `set(key, value)` | saves and returns `value`; `null` removes the key |
| `delete(key)`     | removes the key (a missing key is fine)           |
| `all()`           | every saved key and value                         |

- The file and its folder are created on the first write; a missing file reads as empty.
- A file that is not a JSON object reads as empty, and the next write replaces it.
- Writes go to a temp file and are renamed into place — a crash never leaves half a file.
- Writes from one process run one at a time, so quick successive `set` calls never lose each other.
- `undefined` values and invalid keys throw `TypeError`.

### `createUiStateHandler(store, { endpoint? })`

One Web `Request → Response` function for all routes. `endpoint` defaults to `/api/ui-state`.

| Route                    | Result                                             |
| ------------------------ | -------------------------------------------------- |
| `GET {endpoint}/:key`    | `{ key, value }`; `value` is `null` if unsaved     |
| `PUT {endpoint}/:key`    | body `{ value }` → saves, returns `{ key, value }` |
| `DELETE {endpoint}/:key` | removes the key → `204`                            |

Errors return `{ error }`: `400` bad key or body, `404` path outside `endpoint`, `405` other methods.

### `usePersistedUiState(key, defaultValue, { endpoint?, onError? })`

Returns `{ value, setValue, isLoading }`.

- `value` is `defaultValue` while loading, when nothing is saved, or after a failed load.
- `setValue(next)` shows `next` at once, then saves it. A failed save puts the previous value back and calls `onError` (default `console.error`). `setValue(null)` clears the saved value.
- `isLoading` is `true` until the first load settles.
- Every hook with the same key shares one value: components stay in sync, and each key is fetched once per page load.
- If `setValue` runs before the first load returns, the local value wins.

`clearUiStateCache()` forgets every cached value; use it between tests.

### Keys

`isUiStateKey(key)` — 1–128 characters of letters, digits, `_`, `.` or `-`. Namespace by feature with a dot so features never collide: `'library.layout'`, `'transcripts.authorFilter'`. Keys are URL-safe, so they double as path segments.

## 🔁 Migrating from a Local Copy

LLAAB's `apps/server/src/routes/ui-state/` and `usePersistedUiState` have the same shape:

- Keep the hook call sites; change the import to `@finografic/local-app-kit/react`.
- Replace the store and routes with `createUiStateStore` + `createUiStateHandler`, pointing `filePath` at the existing JSON file — the file format is unchanged.

## 🛠 Development

```bash
pnpm install     # also sets up git hooks
pnpm test:run    # vitest (server tests in node, hook tests in happy-dom)
pnpm typecheck
pnpm lint
pnpm build       # tsdown → dist/
```

See [`docs/process/DEVELOPER_WORKFLOW.md`](./docs/process/DEVELOPER_WORKFLOW.md) and [`docs/process/RELEASE_PROCESS.md`](./docs/process/RELEASE_PROCESS.md).

## 📄 License

MIT © [Justin Rankin](https://github.com/finografic)
