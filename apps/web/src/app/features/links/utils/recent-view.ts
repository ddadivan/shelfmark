import { RECENT_VIEW } from '../models/recent-view.const';
import type { RecentView } from '../models/recent-view.type';

/** The view of `?show=`; anything but `forgotten` (absent, repeated, unknown) is Opened. */
export function parseRecentView(raw: unknown): RecentView {
  return raw === RECENT_VIEW.Forgotten ? RECENT_VIEW.Forgotten : RECENT_VIEW.Opened;
}
