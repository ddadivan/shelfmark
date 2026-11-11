import type { SHARE_ERROR } from './share-error.const';

export type ShareError = (typeof SHARE_ERROR)[keyof typeof SHARE_ERROR];
