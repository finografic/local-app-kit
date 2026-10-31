import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createUiStateStore } from './ui-state.store';

describe('createUiStateStore', () => {
  let dir: string;
  let filePath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ui-state-'));
    filePath = join(dir, 'nested', 'ui-state.json');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('reads null for a missing file and creates it on the first write', async () => {
    const store = createUiStateStore({ filePath });
    expect(await store.get('library.layout')).toBeNull();

    await store.set('library.layout', { mode: 'grid', size: 'md' });
    expect(await store.get('library.layout')).toEqual({ mode: 'grid', size: 'md' });
    expect(await readFile(filePath, 'utf8')).toBe(
      '{\n  "library.layout": {\n    "mode": "grid",\n    "size": "md"\n  }\n}\n',
    );
  });

  it('keeps other keys and removes a key on null or delete', async () => {
    const store = createUiStateStore({ filePath });
    await store.set('a.one', 1);
    await store.set('a.two', 2);
    await store.set('a.one', null);
    expect(await store.all()).toEqual({ 'a.two': 2 });
    await store.delete('a.two');
    expect(await store.all()).toEqual({});
  });

  it('loses no writes when several run at once', async () => {
    const store = createUiStateStore({ filePath });
    await Promise.all(Array.from({ length: 20 }, (_, index) => store.set(`k.${index}`, index)));
    expect(Object.keys(await store.all())).toHaveLength(20);
  });

  it.each(['[1, 2]', 'not json', '"text"'])('reads %s as empty', async (raw) => {
    const store = createUiStateStore({ filePath: join(dir, 'bad.json') });
    await writeFile(store.filePath, raw);
    expect(await store.all()).toEqual({});
  });

  it.each(['', 'has space', 'a/b', 'x'.repeat(129)])('rejects the key %j', async (key) => {
    const store = createUiStateStore({ filePath });
    await expect(store.get(key)).rejects.toThrow(TypeError);
    expect(() => store.set(key, 1)).toThrow(TypeError);
  });

  it('rejects undefined values', () => {
    const store = createUiStateStore({ filePath });
    expect(() => store.set('a.b', undefined)).toThrow(TypeError);
  });
});
