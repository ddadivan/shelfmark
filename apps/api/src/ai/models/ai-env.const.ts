/** Environment variables of the AI module. Never log their values; errors name the variable only. */
export const AI_ENV = {
  /** The provider key. Production only (Vercel, Sensitive); unset means the mock provider. */
  AnthropicApiKey: 'ANTHROPIC_API_KEY',
  /** The embeddings key (Voyage AI, ADR 0052). Production only (Vercel, Sensitive); unset means the mock. */
  VoyageApiKey: 'VOYAGE_API_KEY',
  /** `mock` forces the mock providers (language model and embeddings) even with a key (self-hosting, a production smoke test). */
  Provider: 'AI_PROVIDER',
  /** Comma-separated emails that get Pro and the AI pack (private phase, ADR 0047 point 7). */
  FullAccessEmails: 'AI_FULL_ACCESS_EMAILS',
} as const;
