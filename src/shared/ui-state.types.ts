/** Body of every `GET` / `PUT` response. `value` is `null` when nothing was saved under `key`. */
export interface UiStateResponse<T = unknown> {
  key: string;
  value: T | null;
}

/** Body of a `PUT` request. */
export interface UiStateWriteBody<T = unknown> {
  value: T;
}

/** Body of every error response. */
export interface UiStateErrorBody {
  error: string;
}
