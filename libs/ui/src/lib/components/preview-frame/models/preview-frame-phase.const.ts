/**
 * `loading`: the page is loading (progress bar shown); `loaded`: the page fired `load`;
 * `timedOut`: no `load` within `timeoutMs`; `rejected`: `src` is not an accepted URL and the
 * frame was never given it.
 */
export const PREVIEW_FRAME_PHASE = {
  Loading: 'loading',
  Loaded: 'loaded',
  TimedOut: 'timedOut',
  Rejected: 'rejected',
} as const;
