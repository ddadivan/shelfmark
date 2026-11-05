const NONCE_BYTES = 16;

/** A fresh 128-bit nonce, base64 (24 characters). Uses the Web Crypto CSPRNG only. */
export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
  return btoa(String.fromCharCode(...bytes));
}
