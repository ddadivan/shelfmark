/** What the saving request tells the AI module (the language fallback of `app` summaries). */
export interface AiRequestContext {
  /** The raw `Accept-Language` header, if any. */
  acceptLanguage?: string;
}
