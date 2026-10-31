import type { UiStateErrorBody, UiStateResponse } from '../shared/ui-state.types';
import type { UiStateStore } from './ui-state.store';

import { DEFAULT_UI_STATE_ENDPOINT, isUiStateKey } from '../shared/ui-state.utils';

export interface UiStateHandlerOptions {
  /** Path the handler is mounted on. Defaults to `/api/ui-state`. */
  endpoint?: string;
}

/** A Web-standard request handler: works in Hono, Bun, Deno, Next route handlers and `node:http` adapters. */
export type UiStateHandler = (request: Request) => Promise<Response>;

function json(body: UiStateResponse | UiStateErrorBody, status = 200): Response {
  return Response.json(body, { status });
}

/**
 * HTTP routes for a {@link UiStateStore}, as one Web `Request → Response` function:
 *
 * | Route                    | Result                                             |
 * | ------------------------ | -------------------------------------------------- |
 * | `GET {endpoint}/:key`    | `{ key, value }`; `value` is `null` if unsaved     |
 * | `PUT {endpoint}/:key`    | body `{ value }` → saves, returns `{ key, value }` |
 * | `DELETE {endpoint}/:key` | removes the key → `204`                            |
 *
 * Errors: `400` bad key or body, `404` path outside `endpoint`, `405` other methods.
 *
 * @example
 *   // Hono
 *   const uiState = createUiStateHandler(store);
 *   app.all('/api/ui-state/:key', (c) => uiState(c.req.raw));
 */
export function createUiStateHandler(
  store: UiStateStore,
  { endpoint = DEFAULT_UI_STATE_ENDPOINT }: UiStateHandlerOptions = {},
): UiStateHandler {
  const prefix = `${endpoint.replace(/\/+$/, '')}/`;

  return async (request) => {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith(prefix)) return json({ error: 'Not found' }, 404);

    let key: string;
    try {
      key = decodeURIComponent(pathname.slice(prefix.length));
    } catch {
      return json({ error: 'Invalid UI state key' }, 400);
    }
    if (!isUiStateKey(key)) return json({ error: 'Invalid UI state key' }, 400);

    switch (request.method) {
      case 'GET':
        return json({ key, value: await store.get(key) });
      case 'PUT': {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: 'Body must be JSON' }, 400);
        }
        if (body === null || typeof body !== 'object' || !('value' in body) || body.value === undefined) {
          return json({ error: 'Body must be { "value": … }' }, 400);
        }
        return json({ key, value: await store.set(key, body.value) });
      }
      case 'DELETE':
        await store.delete(key);
        return new Response(null, { status: 204 });
      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { 'allow': 'GET, PUT, DELETE', 'content-type': 'application/json' },
        });
    }
  };
}
