/**
 * How long close waits after going Back before it checks that the preview really closed (#555):
 * when Back only stepped a page the frame navigated to, the preview is still open and close drops
 * `?preview=` instead.
 */
export const PREVIEW_BACK_SETTLE_MS = 300;
