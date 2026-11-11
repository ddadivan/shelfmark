/**
 * Limits of public collections (#276). `PerUserMax` public folders per user (enable answers 409
 * beyond it); a public page lists at most `MaxLinks` links of the subtree, newest first, in pages
 * of `PageSize` (so `MaxPage` pages). `TokenBytes` random bytes make a `TokenLength`-character
 * base64url token.
 */
export const SHARE_LIMIT = {
  PerUserMax: 10,
  MaxLinks: 500,
  PageSize: 50,
  MaxPage: 10,
  TokenBytes: 16,
  TokenLength: 22,
} as const;
