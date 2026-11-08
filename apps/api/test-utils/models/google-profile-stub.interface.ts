export interface GoogleProfileStub {
  /** Google subject (the Better Auth `accountId`). */
  sub: string;
  name: string;
  email: string;
  emailVerified: boolean;
}
