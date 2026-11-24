import type { LANDING_PREVIEW_KIND } from './landing-preview-kind.const';

export type LandingPreviewKind = (typeof LANDING_PREVIEW_KIND)[keyof typeof LANDING_PREVIEW_KIND];
