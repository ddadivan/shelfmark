export interface ExtensionConfig {
  /** Exact `chrome-extension://<id>` origins trusted by the CSRF guard (production: only these). */
  origins: string[];
  /** On a local run (not production, not on Vercel) any well-formed extension origin is trusted. */
  allowAny: boolean;
}
