/** Environment variable names read by the rate limiter (names only; never loads `.env` files). */
export const RATE_LIMIT_ENV = {
  Vercel: 'VERCEL',
  TrustProxyHeaders: 'TRUST_PROXY_HEADERS',
} as const;
