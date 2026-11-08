export interface SignInDemoOptions {
  /** The client address to simulate (`X-Forwarded-For`). Default: a new random address per call. */
  sourceIp?: string;
}
