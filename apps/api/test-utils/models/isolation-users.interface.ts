import type { SignedInUser } from './signed-in-user.interface';

/** Two real signed-in users: `owner` creates the resource, `intruder` tries to reach it. */
export interface IsolationUsers {
  readonly owner: SignedInUser;
  readonly intruder: SignedInUser;
}
