/** The keys of a browser push subscription (`PushSubscription.toJSON().keys`), base64url. */
export interface PushSubscriptionKeys {
  /** The browser's P-256 public key (65 bytes). */
  p256dh: string;
  /** The 16-byte authentication secret. */
  auth: string;
}
