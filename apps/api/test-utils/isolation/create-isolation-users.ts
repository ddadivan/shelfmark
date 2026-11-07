import type { AuthTestApp } from '../models/auth-test-app.interface';
import type { IsolationUsers } from '../models/isolation-users.interface';
import { signInAs } from '../sign-in-as';

/** Signs in the two users of a data-isolation test through the real flow (one after the other). */
export async function createIsolationUsers(t: AuthTestApp): Promise<IsolationUsers> {
  const owner = await signInAs(t.app, t.baseUrl, {
    email: 'owner@example.com',
    name: 'Owner',
  });
  const intruder = await signInAs(t.app, t.baseUrl, {
    email: 'intruder@example.com',
    name: 'Intruder',
  });
  return { owner, intruder };
}
