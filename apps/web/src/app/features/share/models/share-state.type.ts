import type { SHARE_STATE } from './share-state.const';

export type ShareState = (typeof SHARE_STATE)[keyof typeof SHARE_STATE];
