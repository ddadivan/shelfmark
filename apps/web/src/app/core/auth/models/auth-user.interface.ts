/**
 * The signed-in user as the web app needs it. Becomes a shared contract with the real auth API
 * (#64 / #65); until then the shape lives here.
 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  /** Avatar URL, or `null` to show initials. */
  image: string | null;
  isDemo: boolean;
}
