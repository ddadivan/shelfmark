/** Identity of a demo user. The `.invalid` TLD (RFC 2606) can never receive mail or collide with a real account. */
export const DEMO_USER = {
  Name: 'Demo user',
  EmailPrefix: 'demo-',
  EmailDomain: 'demo.shelfmark.invalid',
} as const;
