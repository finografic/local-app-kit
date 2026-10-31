import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { ErrorReporter } from './ui-state.cache';

import { DEFAULT_UI_STATE_ENDPOINT, isUiStateKey } from '../shared/ui-state.utils';
import { getEntry, IDLE_SNAPSHOT, loadEntry, saveEntry } from './ui-state.cache';

export interface UsePersistedUiStateOptions {
  /** Where the server handler is mounted. Defaults to `/api/ui-state`. */
  endpoint?: string;
  /** Called when a load or save fails. Defaults to `console.error`. */
  onError?: ErrorReporter;
}

export interface UsePersistedUiStateResult<T> {
  /** The saved value; `defaultValue` while loading, when nothing is saved, or after a failed load. */
  value: T;
  /** Shows `next` at once and saves it. A failed save restores the previous value. `null` clears it. */
  setValue: (next: T) => void;
  /** True until the first load settles. Gate rendering on it to avoid a flash of `defaultValue`. */
  isLoading: boolean;
}

/**
 * A piece of UI state (a view mode, a filter, a panel toggle) that survives reloads and restarts,
 * saved on the local server by `createUiStateHandler` from `@finografic/local-app-kit/ui-state`.
 *
 * Every hook with the same key shares one value, so two components stay in sync, and the value is
 * fetched once per page load. No query library needed.
 *
 * @example
 *   const { value: layout, setValue: setLayout } = usePersistedUiState('library.layout', {
 *     mode: 'grid',
 *     size: 'md',
 *   });
 *
 * @param key A stable `<feature>.<setting>` name — see `isUiStateKey`.
 * @param defaultValue Used until a saved value arrives, and when there is none.
 */
export function usePersistedUiState<T>(
  key: string,
  defaultValue: T,
  { endpoint = DEFAULT_UI_STATE_ENDPOINT, onError }: UsePersistedUiStateOptions = {},
): UsePersistedUiStateResult<T> {
  if (!isUiStateKey(key)) throw new TypeError(`Invalid UI state key: "${key}"`);
  const url = `${endpoint.replace(/\/+$/, '')}/${key}`;

  // Latest `onError` without resubscribing when the caller passes a new function each render.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });
  const report = useCallback((error: unknown) => (onErrorRef.current ?? console.error)(error), []);

  const subscribe = useCallback(
    (onChange: () => void) => {
      const entry = getEntry(url);
      entry.listeners.add(onChange);
      if (entry.snapshot.status === 'idle' || entry.snapshot.status === 'error') void loadEntry(url, report);
      return () => {
        entry.listeners.delete(onChange);
      };
    },
    [url, report],
  );
  const getSnapshot = useCallback(() => getEntry(url).snapshot, [url]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => IDLE_SNAPSHOT);

  const setValue = useCallback((next: T) => void saveEntry(url, next, report), [url, report]);

  return {
    value: snapshot.hasValue ? (snapshot.value as T) : defaultValue,
    setValue,
    isLoading: snapshot.status === 'idle' || snapshot.status === 'loading',
  };
}
