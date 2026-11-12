import type { SAVE_STATUS_STATE } from './save-status-state.const';

/** `saving`: spinner; `saved`: check in sage; `error`: warning in the danger colour. */
export type SaveStatusState = (typeof SAVE_STATUS_STATE)[keyof typeof SAVE_STATUS_STATE];
