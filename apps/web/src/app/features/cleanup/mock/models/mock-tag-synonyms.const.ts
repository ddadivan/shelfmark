/**
 * The mock's tag-synonym table, the same as the API mock provider's (`MOCK_TAG_SYNONYMS`): names in
 * one set are synonyms (lower case); the first present in most-used order is kept. A tag name with
 * `ai-fail` answers an outage (the AI run is refunded), one with `ai-refuse` a refusal.
 */
export const MOCK_TAG_SYNONYMS = {
  Sets: [
    ['javascript', 'js'],
    ['typescript', 'ts'],
    ['recipes', 'cooking'],
    ['photography', 'photos'],
    ['machine learning', 'ml'],
    ['artificial intelligence', 'ai'],
  ],
  FailMarker: 'ai-fail',
  RefuseMarker: 'ai-refuse',
} as const;
