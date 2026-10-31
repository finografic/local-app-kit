import type { UiStateResponse } from '../shared/ui-state.types';

/**
 * One cache entry per URL, shared by every hook that uses the same key, so two components that
 * read `'library.layout'` stay in sync and the value is fetched once per page load.
 */

export interface UiStateSnapshot {
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** False until the server answers with a saved value (or a local `setValue`). */
  hasValue: boolean;
  value: unknown;
}

interface Entry {
  snapshot: UiStateSnapshot;
  listeners: Set<() => void>;
  /** Bumped by every local write; a load or failed write from an older version is ignored. */
  version: number;
}

export type ErrorReporter = (error: unknown) => void;

export const IDLE_SNAPSHOT: UiStateSnapshot = { status: 'idle', hasValue: false, value: undefined };

const entries = new Map<string, Entry>();

export function getEntry(url: string): Entry {
  let entry = entries.get(url);
  if (!entry) {
    entry = { snapshot: IDLE_SNAPSHOT, listeners: new Set(), version: 0 };
    entries.set(url, entry);
  }
  return entry;
}

function publish(entry: Entry, snapshot: UiStateSnapshot): void {
  entry.snapshot = snapshot;
  for (const listener of entry.listeners) listener();
}

async function request(url: string, init?: RequestInit): Promise<UiStateResponse> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${init?.method ?? 'GET'} ${url} failed with ${response.status}`);
  return (await response.json()) as UiStateResponse;
}

export async function loadEntry(url: string, onError: ErrorReporter): Promise<void> {
  const entry = getEntry(url);
  const { version } = entry;
  publish(entry, { ...entry.snapshot, status: 'loading' });
  try {
    const { value } = await request(url);
    if (entry.version !== version) return;
    publish(entry, { status: 'ready', hasValue: value !== null, value });
  } catch (error) {
    if (entry.version === version) publish(entry, { ...entry.snapshot, status: 'error' });
    onError(error);
  }
}

/** Shows `value` at once, then saves it; a failed save puts the previous value back. */
export async function saveEntry(url: string, value: unknown, onError: ErrorReporter): Promise<void> {
  const entry = getEntry(url);
  const previous = entry.snapshot;
  const version = ++entry.version;
  publish(entry, { status: 'ready', hasValue: value !== null, value });
  try {
    await request(url, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ value }),
    });
  } catch (error) {
    if (entry.version === version) publish(entry, previous);
    onError(error);
  }
}

/**
 * Forgets every cached value; mounted hooks reload on their next subscribe. For tests, or after
 * something outside the hook changed the store.
 */
export function clearUiStateCache(): void {
  entries.clear();
}
