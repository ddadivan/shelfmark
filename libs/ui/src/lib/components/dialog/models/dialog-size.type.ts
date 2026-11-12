import type { DIALOG_SIZE } from './dialog-size.const';

/** Panel width: 440px (`sm`, confirmations) or 560px (`md`, forms). */
export type DialogSize = (typeof DIALOG_SIZE)[keyof typeof DIALOG_SIZE];
