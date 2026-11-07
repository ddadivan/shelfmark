/** The signed-in user as the web sees it. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  isDemo: boolean;
  /** ISO time the demo sandbox ends; `null` for a regular user. */
  demoExpiresAt: string | null;
}
