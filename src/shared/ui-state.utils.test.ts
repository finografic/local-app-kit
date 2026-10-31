import { describe, expect, it } from 'vitest';

import { isUiStateKey, UI_STATE_KEY_MAX_LENGTH } from './ui-state.utils';

describe('isUiStateKey', () => {
  it.each(['library.layout', 'a', 'transcripts.authorFilter', 'x_y-z.1'])('accepts %j', (key) => {
    expect(isUiStateKey(key)).toBe(true);
  });

  it.each(['', 'has space', 'a/b', 'a?b', 'é'])('rejects %j', (key) => {
    expect(isUiStateKey(key)).toBe(false);
  });

  it('caps the length', () => {
    expect(isUiStateKey('x'.repeat(UI_STATE_KEY_MAX_LENGTH))).toBe(true);
    expect(isUiStateKey('x'.repeat(UI_STATE_KEY_MAX_LENGTH + 1))).toBe(false);
  });
});
