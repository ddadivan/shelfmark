import type { PreviewLimits } from './preview-limits.interface';

export const PREVIEW_LIMITS: PreviewLimits = {
  maxTitleLength: 300,
  maxDescriptionLength: 1_000,
  // parse5 is quadratic on deeply nested markup; 32 K keeps a pathological page fast.
  maxParsedChars: 32_768,
  maxUrlLength: 2_048,
};
