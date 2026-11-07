import type { PreviewLimits } from './preview-limits.interface';

export const PREVIEW_LIMITS: PreviewLimits = {
  maxTitleLength: 300,
  maxDescriptionLength: 1_000,
  maxParsedChars: 65_536,
};
