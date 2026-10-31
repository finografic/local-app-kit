// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearUiStateCache } from './ui-state.cache';
import { usePersistedUiState } from './usePersistedUiState';

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

function stubFetch(handler: Handler) {
  // The hook always passes a string URL.
  const fetchMock = vi.fn((input: string, init?: RequestInit) => Promise.resolve(handler(input, init)));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const ok = (key: string, value: unknown) => Response.json({ key, value });

describe('usePersistedUiState', () => {
  beforeEach(() => {
    clearUiStateCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the default while loading, then the saved value', async () => {
    const fetchMock = stubFetch(() => ok('library.layout', 'list'));
    const { result } = renderHook(() => usePersistedUiState('library.layout', 'grid'));
    expect(result.current).toMatchObject({ value: 'grid', isLoading: true });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.value).toBe('list');
    expect(fetchMock).toHaveBeenCalledWith('/api/ui-state/library.layout', undefined);
  });

  it('keeps the default when nothing is saved', async () => {
    stubFetch(() => ok('a.b', null));
    const { result } = renderHook(() => usePersistedUiState('a.b', 7));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.value).toBe(7);
  });

  it('fetches once for hooks that share a key, and keeps them in sync', async () => {
    const fetchMock = stubFetch((_, init) => (init?.method === 'PUT' ? ok('a.b', 2) : ok('a.b', 1)));
    const first = renderHook(() => usePersistedUiState('a.b', 0));
    const second = renderHook(() => usePersistedUiState('a.b', 0));
    await waitFor(() => expect(second.result.current.value).toBe(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => first.result.current.setValue(2));
    expect(second.result.current.value).toBe(2);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/ui-state/a.b', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: '{"value":2}',
    });
  });

  it('restores the previous value when a save fails', async () => {
    const onError = vi.fn();
    stubFetch((_, init) => (init?.method === 'PUT' ? new Response(null, { status: 500 }) : ok('a.b', 'old')));
    const { result } = renderHook(() => usePersistedUiState('a.b', 'default', { onError }));
    await waitFor(() => expect(result.current.value).toBe('old'));

    act(() => result.current.setValue('new'));
    expect(result.current.value).toBe('new');
    await waitFor(() => expect(result.current.value).toBe('old'));
    expect(onError).toHaveBeenCalledOnce();
  });

  it('keeps a local write that lands before the first load returns', async () => {
    let answer: (response: Response) => void = () => {};
    stubFetch((_, init) =>
      init?.method === 'PUT' ? ok('a.b', 'mine') : new Promise<Response>((resolve) => (answer = resolve)),
    );
    const { result } = renderHook(() => usePersistedUiState('a.b', 'default'));
    act(() => result.current.setValue('mine'));
    await act(async () => answer(ok('a.b', 'server')));
    expect(result.current.value).toBe('mine');
  });

  it('falls back to the default and reports when the load fails', async () => {
    const onError = vi.fn();
    stubFetch(() => new Response(null, { status: 503 }));
    const { result } = renderHook(() => usePersistedUiState('a.b', 'default', { onError }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.value).toBe('default');
    expect(onError).toHaveBeenCalledOnce();
  });

  it('uses a custom endpoint', async () => {
    const fetchMock = stubFetch(() => ok('a.b', 1));
    renderHook(() => usePersistedUiState('a.b', 0, { endpoint: '/state/' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/state/a.b', undefined));
  });

  it('throws on an invalid key', () => {
    stubFetch(() => ok('x', null));
    expect(() => renderHook(() => usePersistedUiState('bad key', 0))).toThrow(TypeError);
  });
});
