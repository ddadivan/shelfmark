import { createAuthTestApp } from '../../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../../test-utils/isolation/expect-isolated';
import { LEAK } from '../../../test-utils/isolation/leak.const';
import { LeakyNotesFixtureModule } from '../../../test-utils/isolation/leaky-notes-fixture.module';
import { NotesFixtureModule } from '../../../test-utils/isolation/notes-fixture.module';
import { randomUuidV7 } from '../../../test-utils/isolation/random-uuid-v7';
import type { AuthTestApp } from '../../../test-utils/models/auth-test-app.interface';
import { FIXTURE_PATH } from '../../../test-utils/models/fixture-path.const';
import type { IsolationScenario } from '../../../test-utils/models/isolation-scenario.interface';
import type { TestAgent } from '../../../test-utils/models/test-agent.interface';
import type { IsolationUsers } from '../../../test-utils/models/isolation-users.interface';

const MISSING = '00000000-0000-7000-8000-000000000000';
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function idsOf(body: unknown): string[] {
  return (body as { items: { id: string }[] }).items.map((n) => n.id);
}

function notes(base: string): IsolationScenario {
  return {
    create: async (owner) => (await owner.post(base).send({ text: 'a' }).expect(201)).body.id,
    read: (agent, id) => agent.get(`${base}/${id}`),
    update: (agent, id) => agent.patch(`${base}/${id}`).send({ text: 'b' }),
    remove: (agent, id) => agent.delete(`${base}/${id}`),
    list: { request: (agent) => agent.get(base), ids: idsOf },
    reference: (agent, id) => agent.post(`${base}/copy`).send({ sourceId: id }),
  };
}

describe('expectIsolated harness', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;

  beforeAll(async () => {
    t = await createAuthTestApp({ imports: [NotesFixtureModule, LeakyNotesFixtureModule] });
    users = await createIsolationUsers(t);
  });

  afterAll(async () => {
    await t.close();
  });

  it('passes for a correctly isolated resource', async () => {
    await expectIsolated(t.app, users, notes(FIXTURE_PATH.Notes));
  });

  it('passes with explicit skips and a custom missing id', async () => {
    const full = notes(FIXTURE_PATH.Notes);
    await expectIsolated(t.app, users, {
      create: full.create,
      read: full.read,
      skip: {
        update: 'read-only resource',
        remove: 'cannot be deleted',
        list: 'no list endpoint',
        reference: 'nothing references it',
      },
      missingId: randomUuidV7,
    });
  });

  it('refuses an omitted operation without a skip reason', async () => {
    const full = notes(FIXTURE_PATH.Notes);
    await expect(
      expectIsolated(t.app, users, { create: full.create, read: full.read }),
    ).rejects.toThrow(/update is neither provided nor skipped with a reason/);
    await expect(
      expectIsolated(t.app, users, {
        ...full,
        reference: undefined,
        skip: { reference: '  ' },
      }),
    ).rejects.toThrow(/reference is neither provided nor skipped/);
  });

  it('generates UUIDv7-shaped missing ids', () => {
    expect(randomUuidV7()).toMatch(UUID_V7);
    expect(randomUuidV7()).not.toBe(randomUuidV7());
  });

  const rejections: [string, RegExp][] = [
    [LEAK.Read, /intruder read of a foreign id must be 404/],
    [LEAK.Update, /intruder update of a foreign id must be 404/],
    [LEAK.Remove, /intruder remove of a foreign id must be 404/],
    [LEAK.Reference, /intruder reference of a foreign id must be 404/],
    [LEAK.List, /intruder list must not hold the id/],
    [LEAK.ListStatus, /intruder list must be 200/],
    [LEAK.Forbidden, /intruder read of a foreign id must be 404/],
    [LEAK.Distinguishable, /a foreign id must look exactly like a missing one/],
    [LEAK.Body, /intruder read must answer a bare ApiError/],
    [LEAK.MutateOnMiss, /unchanged after the intruder attempts/],
    [LEAK.DeleteOnMiss, /nothing deleted/],
  ];
  it.each(rejections)('rejects a resource that leaks (%s)', async (leak, message) => {
    await expect(
      expectIsolated(t.app, users, notes(`${FIXTURE_PATH.LeakyNotes}/${leak}`)),
    ).rejects.toThrow(message);
  });

  it('rejects an anonymous read that is not 401', async () => {
    const scenario: IsolationScenario = {
      create: () => Promise.resolve('x'),
      read: (agent) => agent.get('/api/health'),
      skip: { update: 'n/a', remove: 'n/a', list: 'n/a', reference: 'n/a' },
    };
    await expect(expectIsolated(t.app, users, scenario)).rejects.toThrow(/anonymous read/);
  });

  it('rejects an anonymous 401 that is not a bare ApiError', async () => {
    const scenario: IsolationScenario = {
      create: () => Promise.resolve('x'),
      read: (agent, id) => agent.get(`${FIXTURE_PATH.CookieGate}/${id}`),
      skip: { update: 'n/a', remove: 'n/a', list: 'n/a', reference: 'n/a' },
    };
    await expect(expectIsolated(t.app, users, scenario)).rejects.toThrow(
      /anonymous read must answer a bare ApiError/,
    );
  });

  it('rejects an anonymous update that is not 401', async () => {
    const scenario = {
      ...notes(FIXTURE_PATH.Notes),
      update: (agent: Parameters<NonNullable<IsolationScenario['update']>>[0]) =>
        agent.get('/api/health'),
    };
    await expect(expectIsolated(t.app, users, scenario)).rejects.toThrow(/anonymous update/);
  });

  it('rejects an owner read that is not 200', async () => {
    const scenario: IsolationScenario = {
      create: () => Promise.resolve(MISSING),
      read: (agent, id) => agent.get(`${FIXTURE_PATH.Notes}/${id}`),
      skip: { update: 'n/a', remove: 'n/a', list: 'n/a', reference: 'n/a' },
    };
    await expect(expectIsolated(t.app, users, scenario)).rejects.toThrow(
      /the owner must read the new resource/,
    );
  });

  it('rejects a list that does not hold the owner resource', async () => {
    const scenario = notes(FIXTURE_PATH.Notes);
    const list = { request: (agent: TestAgent) => agent.get(FIXTURE_PATH.Notes), ids: () => [] };
    await expect(expectIsolated(t.app, users, { ...scenario, list })).rejects.toThrow(
      /owner list must hold the id/,
    );
  });
});
