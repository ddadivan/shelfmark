import { AUTH_ENDPOINT } from '@shelfmark/contracts';
import type { AuthUser, GetSessionResponse, OnboardingResponse } from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';

const ONBOARDING = '/api/me/onboarding';

describe('onboarding flag', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
    users = await createIsolationUsers(t);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  async function sessionUser(who: IsolationUsers['owner']): Promise<AuthUser | undefined> {
    const res = await asUser(t.app, who).get(AUTH_ENDPOINT.GetSession).expect(200);
    return (res.body as GetSessionResponse)?.user;
  }

  async function stored(userId: string): Promise<Date | null> {
    const row = await t.db.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return row.onboardingCompletedAt;
  }

  it('is null for a new user in get-session', async () => {
    expect((await sessionUser(users.owner))?.onboardingCompletedAt).toBeNull();
  });

  it('completes, shows through get-session, and is idempotent', async () => {
    const first = await asUser(t.app, users.owner).post(ONBOARDING).expect(200);
    const { onboardingCompletedAt } = first.body as OnboardingResponse;
    expect(Date.parse(onboardingCompletedAt)).not.toBeNaN();
    expect((await stored(users.owner.userId))?.toISOString()).toBe(onboardingCompletedAt);
    expect((await sessionUser(users.owner))?.onboardingCompletedAt).toBe(onboardingCompletedAt);

    const second = await asUser(t.app, users.owner).post(ONBOARDING).expect(200);
    expect((second.body as OnboardingResponse).onboardingCompletedAt).toBe(onboardingCompletedAt);
  });

  it('is one-way: there is no DELETE to show it again (#315)', async () => {
    await asUser(t.app, users.owner).post(ONBOARDING).expect(200);
    const stamp = await stored(users.owner.userId);
    await asUser(t.app, users.owner).delete(ONBOARDING).expect(404);
    expect(await stored(users.owner.userId)).toEqual(stamp);
  });

  it('never touches another user', async () => {
    await asUser(t.app, users.owner).post(ONBOARDING).expect(200);
    expect(await stored(users.intruder.userId)).toBeNull();

    const ownerStamp = await stored(users.owner.userId);
    await asUser(t.app, users.intruder).post(ONBOARDING).expect(200);
    expect(await stored(users.intruder.userId)).not.toBeNull();
    expect(await stored(users.owner.userId)).toEqual(ownerStamp);
  });

  it('ignores a userId in the query', async () => {
    await asUser(t.app, users.owner)
      .post(`${ONBOARDING}?userId=${users.intruder.userId}`)
      .expect(200);
    expect(await stored(users.intruder.userId)).toBeNull();
    expect(await stored(users.owner.userId)).not.toBeNull();
  });

  it('needs a session', async () => {
    await anonymous(t.app).post(ONBOARDING).expect(401);
  });
});
