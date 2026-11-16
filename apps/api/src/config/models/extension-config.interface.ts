export interface ExtensionConfig {
  /** Exact `chrome-extension://<id>` origins trusted by the CSRF guard (production: only these). */
  origins: string[];
  /** Outside production any well-formed extension origin is trusted, so an unpacked dev build works. */
  allowAny: boolean;
}
