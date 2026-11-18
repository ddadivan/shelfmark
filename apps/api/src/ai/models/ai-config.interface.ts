/** AI configuration read once at boot (`readAiConfig`). */
export interface AiConfig {
  /** The provider key, or `null`. Never log, echo or return it. */
  apiKey: string | null;
  /**
   * True only when a real model may be called for a non-demo user: a key exists, `AI_PROVIDER` is
   * not `mock`, the environment is production and it is not a Vercel preview deployment. Dev, test,
   * CI, previews and the demo always run on the mock provider.
   */
  useRealProvider: boolean;
  /** The Voyage embeddings key, or `null`. Never log, echo or return it. */
  voyageApiKey: string | null;
  /** Same rule as `useRealProvider`, for the Voyage key (ADR 0051 point 1). */
  useRealEmbeddings: boolean;
}
