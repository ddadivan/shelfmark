/**
 * The mock's tag-synonym table (AI-5): names in one set are synonyms (compared in lower case). Covers
 * the demo seed (`js` / `javascript`, `cooking` / `recipes`). Triggers for tests and e2e: a tag named
 * with `ai-fail` answers a retryable outage, one with `ai-refuse` a refusal.
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
