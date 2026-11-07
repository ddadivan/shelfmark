export interface GitHubProfileStub {
  /** GitHub numeric account id (the Better Auth `accountId`). */
  id: number;
  login: string;
  name: string;
  email: string;
  /** Whether GitHub reports the email as verified in `/user/emails`. */
  emailVerified: boolean;
}
