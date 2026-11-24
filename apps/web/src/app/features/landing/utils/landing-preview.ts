import type { LandingPreviewCard } from '../models/landing-preview-card.interface';
import { LANDING_PREVIEW_SCOPE } from '../models/landing-preview-scope.const';
import type { LandingPreviewScope } from '../models/landing-preview-scope.type';
import type { LandingPreviewState } from '../models/landing-preview-state.interface';
import { LANDING_PREVIEW_STATES } from '../models/landing-preview-states.const';
import type { LandingPreviewTab } from '../models/landing-preview-tab.type';

/** Whether a card belongs to a frame: All links (by tab), Favorites, or its folder. */
export function previewShows(card: LandingPreviewCard, state: LandingPreviewState): boolean {
  switch (state.scope) {
    case LANDING_PREVIEW_SCOPE.All:
      return state.tab === 'all' || card.kind === state.tab;
    case LANDING_PREVIEW_SCOPE.Favorites:
      return card.favorite;
    default:
      return card.folder === state.scope;
  }
}

/** The frame of the cycle a click on a sidebar row or a tab picks, or -1 when the cycle has none. */
export function previewStateIndex(scope: LandingPreviewScope, tab: LandingPreviewTab): number {
  return LANDING_PREVIEW_STATES.findIndex((state) => state.scope === scope && state.tab === tab);
}

/** All links › All: the only frame with the "Saved to Watch later" toast. */
export function previewIsHome(state: LandingPreviewState): boolean {
  return state.scope === LANDING_PREVIEW_SCOPE.All && state.tab === 'all';
}
