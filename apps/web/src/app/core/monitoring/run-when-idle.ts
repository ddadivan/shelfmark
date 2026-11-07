const IDLE_TIMEOUT_MS = 5000;
const FALLBACK_DELAY_MS = 2000;

/** Runs `task` once the browser is idle, so monitoring never competes with the first paint. */
export function runWhenIdle(task: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(task, { timeout: IDLE_TIMEOUT_MS });
  } else {
    setTimeout(task, FALLBACK_DELAY_MS);
  }
}
