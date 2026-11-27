import type { InViewRoot } from './in-view-root.type';

export interface InViewOptions {
  readonly root: InViewRoot;
  /** Share of the host that must show (0 to 1), or several steps. */
  readonly threshold: number | readonly number[];
  /** `rootMargin`, for example `'0px 0px 320px 0px'` to fire before the host is on screen. */
  readonly margin: string;
}
