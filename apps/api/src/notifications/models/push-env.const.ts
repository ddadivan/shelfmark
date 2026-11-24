/** Environment variables of Web Push (VAPID, RFC 8292). Never logged; errors name the variable only. */
export const PUSH_ENV = {
  PublicKey: 'VAPID_PUBLIC_KEY',
  PrivateKey: 'VAPID_PRIVATE_KEY',
  Subject: 'VAPID_SUBJECT',
} as const;
