/** A freshly generated personal token: the secret (shown once) and what is stored of it. */
export interface GeneratedToken {
  secret: string;
  /** `hashToken(secret)`. */
  hash: string;
  /** The last four characters of the secret. */
  last4: string;
}
