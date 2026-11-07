/** Session data exposed to the web. The session token, IP address and user agent never leave the API. */
export interface AuthSession {
  /** ISO 8601 */
  expiresAt: string;
}
