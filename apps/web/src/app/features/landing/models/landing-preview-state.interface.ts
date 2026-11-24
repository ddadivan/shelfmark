import type { LandingPreviewScope } from './landing-preview-scope.type';
import type { LandingPreviewTab } from './landing-preview-tab.type';

/** One frame of the app preview's cycle: the sidebar row and, on All links, the tab. */
export interface LandingPreviewState {
  readonly scope: LandingPreviewScope;
  readonly tab: LandingPreviewTab;
}
