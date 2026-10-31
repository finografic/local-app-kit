// Browser-safe root: shared types and key rules only. Node code lives in `./ui-state`, React in `./react`.
export { DEFAULT_UI_STATE_ENDPOINT, UI_STATE_KEY_MAX_LENGTH, isUiStateKey } from './shared/ui-state.utils';
export type { UiStateErrorBody, UiStateResponse, UiStateWriteBody } from './shared/ui-state.types';
