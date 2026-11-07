export interface OAuthProviderStub {
  /** Every provider-side secret the stub hands out (access, refresh and ID tokens). Generated per run. */
  readonly tokens: readonly string[];
  /** `METHOD url` of every outbound request seen, in order. */
  readonly requests: readonly string[];
  /** Restores `globalThis.fetch`. */
  restore(): void;
}
