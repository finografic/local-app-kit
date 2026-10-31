/** Mount point the server handler and the React hook agree on by default. */
export const DEFAULT_UI_STATE_ENDPOINT = '/api/ui-state';

/** Longest key accepted; keys are short `<feature>.<setting>` names, not data. */
export const UI_STATE_KEY_MAX_LENGTH = 128;

const KEY_PATTERN = /^[\w.-]+$/;

/**
 * Whether `key` is a valid UI state key: 1–128 characters of letters, digits, `_`, `.` or `-`.
 *
 * Namespace keys by feature with a dot — `'library.layout'`, `'transcripts.authorFilter'` — so
 * unrelated features never collide. The pattern is URL-safe, so a key is also a path segment.
 */
export function isUiStateKey(key: string): boolean {
  return key.length <= UI_STATE_KEY_MAX_LENGTH && KEY_PATTERN.test(key);
}
