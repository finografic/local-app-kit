import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { UiStateHandler } from './ui-state.handler';

import { createUiStateHandler } from './ui-state.handler';
import { createUiStateStore } from './ui-state.store';

const BASE = 'http://localhost:4000';

describe('createUiStateHandler', () => {
  let dir: string;
  let handle: UiStateHandler;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ui-state-'));
    handle = createUiStateHandler(createUiStateStore({ filePath: join(dir, 'ui-state.json') }));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const put = (path: string, body: string) =>
    handle(
      new Request(`${BASE}${path}`, { method: 'PUT', body, headers: { 'content-type': 'application/json' } }),
    );

  it('returns null for an unsaved key, then the saved value', async () => {
    const before = await handle(new Request(`${BASE}/api/ui-state/library.layout`));
    expect(await before.json()).toEqual({ key: 'library.layout', value: null });

    const saved = await put('/api/ui-state/library.layout', '{"value":{"mode":"list"}}');
    expect(saved.status).toBe(200);
    expect(await saved.json()).toEqual({ key: 'library.layout', value: { mode: 'list' } });

    const after = await handle(new Request(`${BASE}/api/ui-state/library.layout`));
    expect(await after.json()).toEqual({ key: 'library.layout', value: { mode: 'list' } });
  });

  it('deletes a key', async () => {
    await put('/api/ui-state/a.b', '{"value":1}');
    const deleted = await handle(new Request(`${BASE}/api/ui-state/a.b`, { method: 'DELETE' }));
    expect(deleted.status).toBe(204);
    const after = await handle(new Request(`${BASE}/api/ui-state/a.b`));
    expect(await after.json()).toEqual({ key: 'a.b', value: null });
  });

  it.each([
    ['bad key', '/api/ui-state/has%20space', '{"value":1}', 400],
    ['nested path', '/api/ui-state/a/b', '{"value":1}', 400],
    ['not JSON', '/api/ui-state/a.b', 'nope', 400],
    ['no value', '/api/ui-state/a.b', '{"other":1}', 400],
    ['outside endpoint', '/api/other/a.b', '{"value":1}', 404],
  ])('rejects %s', async (_, path, body, status) => {
    expect((await put(path, body)).status).toBe(status);
  });

  it('rejects other methods with 405', async () => {
    const response = await handle(new Request(`${BASE}/api/ui-state/a.b`, { method: 'POST', body: '{}' }));
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, PUT, DELETE');
  });

  it('honours a custom endpoint', async () => {
    const custom = createUiStateHandler(createUiStateStore({ filePath: join(dir, 'x.json') }), {
      endpoint: '/state/',
    });
    const response = await custom(new Request(`${BASE}/state/a.b`));
    expect(await response.json()).toEqual({ key: 'a.b', value: null });
  });
});
