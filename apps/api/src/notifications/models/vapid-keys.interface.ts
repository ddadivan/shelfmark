/** The VAPID key pair and contact the push services see (RFC 8292). Server-only. */
export interface VapidKeys {
  /** base64url, uncompressed P-256 point (65 bytes). Also answered to the web app. */
  publicKey: string;
  /** base64url, 32 bytes. Never logged or answered. */
  privateKey: string;
  /** `mailto:` or `https:` contact for the push services. */
  subject: string;
}
