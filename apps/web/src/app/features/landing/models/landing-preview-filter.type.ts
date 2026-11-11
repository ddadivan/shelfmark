import type { LANDING_PREVIEW_FILTER } from './landing-preview-filter.const';

export type LandingPreviewFilter =
  (typeof LANDING_PREVIEW_FILTER)[keyof typeof LANDING_PREVIEW_FILTER];
