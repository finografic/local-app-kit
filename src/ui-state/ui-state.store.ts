import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { isUiStateKey } from '../shared/ui-state.utils';

export type UiStateRecord = Record<string, unknown>;

export interface UiStateStore {
  /** Absolute or cwd-relative path of the JSON file. */
  readonly filePath: string;
  /** The saved value, or `null` when nothing was saved under `key`. */
  get<T = unknown>(key: string): Promise<T | null>;
  /** Saves `value` under `key` and returns it. `null` removes the key. */
  set<T>(key: string, value: T): Promise<T>;
  /** Removes `key`. Missing keys are fine. */
  delete(key: string): Promise<void>;
  /** Every saved key and value. */
  all(): Promise<UiStateRecord>;
}

export interface UiStateStoreOptions {
  /**
   * Where the JSON file lives, e.g. `resolve(projectRoot, 'data/ui-state.json')`. The file and its
   * folder are created on the first write.
   */
  filePath: string;
}

function assertKey(key: string): void {
  if (!isUiStateKey(key)) throw new TypeError(`Invalid UI state key: "${key}"`);
}

function isRecord(value: unknown): value is UiStateRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * A small key/value store for UI state, kept in one human-readable JSON file.
 *
 * - A missing file reads as empty; the first write creates it.
 * - A file that is not a JSON object also reads as empty, and the next write replaces it.
 * - Writes go to a temp file and are renamed into place, so a crash never leaves half a file.
 * - Writes from this process run one at a time, so two quick `set` calls never lose each other.
 *
 * @example
 *   const uiState = createUiStateStore({ filePath: resolve(root, 'data/ui-state.json') });
 *   await uiState.set('library.layout', { mode: 'grid', size: 'md' });
 *   await uiState.get('library.layout'); // { mode: 'grid', size: 'md' }
 */
export function createUiStateStore({ filePath }: UiStateStoreOptions): UiStateStore {
  let queue: Promise<unknown> = Promise.resolve();

  async function read(): Promise<UiStateRecord> {
    let raw: string;
    try {
      raw = await readFile(filePath, 'utf8');
    } catch (error) {
      if ((error as { code?: string }).code === 'ENOENT') return {};
      throw error;
    }
    try {
      const data = JSON.parse(raw) as unknown;
      return isRecord(data) ? data : {};
    } catch {
      return {};
    }
  }

  async function write(state: UiStateRecord): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.${process.pid}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    await rename(tempPath, filePath);
  }

  /** Runs `task` after every earlier write, even a failed one. */
  function serialize<T>(task: () => Promise<T>): Promise<T> {
    const result = queue.then(task, task);
    queue = result.catch(() => undefined);
    return result;
  }

  async function update(change: (state: UiStateRecord) => void): Promise<void> {
    const state = await read();
    change(state);
    await write(state);
  }

  return {
    filePath,
    async get<T = unknown>(key: string): Promise<T | null> {
      assertKey(key);
      await queue;
      return ((await read())[key] ?? null) as T | null;
    },
    set<T>(key: string, value: T): Promise<T> {
      assertKey(key);
      if (value === undefined) throw new TypeError('UI state value must not be undefined');
      return serialize(async () => {
        await update((state) => {
          if (value === null) delete state[key];
          else state[key] = value;
        });
        return value;
      });
    },
    delete(key: string): Promise<void> {
      assertKey(key);
      return serialize(() => update((state) => delete state[key]));
    },
    async all(): Promise<UiStateRecord> {
      await queue;
      return read();
    },
  };
}
