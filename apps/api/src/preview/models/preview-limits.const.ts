import type { PreviewLimits } from './preview-limits.interface';

export const PREVIEW_LIMITS: PreviewLimits = {
  maxTitleLength: 300,
  maxDescriptionLength: 1_000,
  // parse5 is quadratic on deeply nested markup; 32 K keeps a pathological page fast.
  maxParsedChars: 32_768,
  maxUrlLength: 2_048,
  // JSON-LD is parsed as data only, for its `@type` (#537); the head cap above bounds it too.
  maxJsonLdScripts: 4,
  maxJsonLdChars: 16_384,
  maxJsonLdEntities: 64,
};
