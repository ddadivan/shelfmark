import type { Test } from 'supertest';
import { createAuthTestApp } from '../../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../../test-utils/isolation/expect-isolated';
import { LEAK } from '../../../test-utils/isolation/leak.const';
import { LeakyNotesFixtureModule } from '../../../test-utils/isolation/leaky-notes-fixture.module';
import { NotesFixtureModule } from '../../../test-utils/isolation/notes-fixture.module';
import type { IsolationScenario } from '../../../test-utils/models/isolation-scenario.interface';
import type { IsolationUsers } from '../../../test-utils/models/isolation-users.interface';
import type { AuthTestApp } from '../../../test-utils/models/auth-test-app.interface';
import type { TestAgent } from '../../../test-utils/models/test-agent.interface';
import { asUser } from '../../../test-utils/isolation/test-agent';

const MISSING = '00000000-0000-7000-8000-000000000000';

function notes(base: string): IsolationScenario {
  return {
    create: async (owner) => (await owner.post(base).send({ text: 'a' }).expect(201)).body.id,
    read: (agent, id) => agent.get(`${base}/${id}`),
    update: (agent, id) => agent.patch(`${base}/${id}`).send({ text: 'b' }),
    remove: (agent, id) => agent.delete(`${base}/${id}`),
    list: { request: (agent) => agent.get(base), ids: (body) => idsOf(body) },
    reference: (agent, id) => agent.get(`${base}/${id}`),
  };
}

function idsOf(body: unknown): string[] {
  return (body as { items: { id: string }[] }).items.map((n) => n.id);
}

describe('expectIsolated harness', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;

  beforeAll(async () => {
    t = await createAuthTestApp({
      imports: [NotesFixtureModule, LeakyNotesFixtureModule],
    });
    users = await createIsolationUsers(t);
  });

  afterAll(async () => {
    await t.close();
  });

  it('passes for a correctly isolated resource', async () => {
    await expectIsolated(t.app, users, notes('/api/__fixture/notes'));
  });

  it('passes with only a read', async () => {
    const full = notes('/api/__fixture/notes');
    await expectIsolated(t.app, users, { create: full.create, read: full.read });
  });

  const rejections: [string, RegExp][] = [
    [LEAK.Read, /intruder read of a foreign id must be 404/],
    [LEAK.Update, /intruder update of a foreign id must be 404/],
    [LEAK.Remove, /intruder remove of a foreign id must be 404/],
    [LEAK.List, /intruder list must not hold the id/],
    [LEAK.Forbidden, /intruder read of a foreign id must be 404/],
    [LEAK.Distinguishable, /a foreign id must look exactly like a missing one/],
  ];
  it.each(rejections)('rejects a resource that leaks (%s)', async (leak, message) => {
    await expect(
      expectIsolated(t.app, users, notes(`/api/__fixture/leaky-notes/${leak}`)),
    ).rejects.toThrow(message);
  });

  it('rejects a read that anonymous users can reach', async () => {
    const scenario: IsolationScenario = {
      create: () => Promise.resolve('x'),
      read: (agent) => agent.get('/api/health'),
    };
    await expect(expectIsolated(t.app, users, scenario)).rejects.toThrow(/anonymous read/);
  });

  it('rejects an owner read that is not 200', async () => {
    const scenario: IsolationScenario = {
      create: () => Promise.resolve(MISSING),
      read: (agent, id) => agent.get(`/api/__fixture/notes/${id}`),
    };
    await expect(expectIsolated(t.app, users, scenario)).rejects.toThrow(
      /the owner must read the new resource/,
    );
  });

  describe('when the owner loses the resource during the attacks', () => {
    // The scenario answers the 5th owner-visible read from another path: the harness' "after" read.
    function stateful(
      afterRead: (owner: TestAgent, id: string, otherId: string) => Test,
      ownerIds?: (body: unknown) => string[],
    ): IsolationScenario {
      const base = '/api/__fixture/notes';
      let reads = 0;
      let otherId = '';
      const owner = asUser(t.app, users.owner);
      return {
        create: async (agent) => {
          otherId = (await agent.post(base).send({ text: 'other' }).expect(201)).body.id;
          return (await agent.post(base).send({ text: 'a' }).expect(201)).body.id;
        },
        read: (agent, id) => {
          reads += 1;
          // calls: owner before (1), anonymous (2), intruder foreign (3), intruder missing (4), owner after (5)
          return reads === 5 ? afterRead(owner, id, otherId) : agent.get(`${base}/${id}`);
        },
        list: { request: (agent) => agent.get(base), ids: ownerIds ?? idsOf },
      };
    }

    it('rejects a resource that was deleted', async () => {
      const scenario = stateful((agent) => agent.get(`/api/__fixture/notes/${MISSING}`));
      await expect(expectIsolated(t.app, users, scenario)).rejects.toThrow(/nothing deleted/);
    });

    it('rejects a resource that changed', async () => {
      const scenario = stateful((agent, _id, other) => agent.get(`/api/__fixture/notes/${other}`));
      await expect(expectIsolated(t.app, users, scenario)).rejects.toThrow(/unchanged/);
    });

    it('rejects a list that does not hold the owner resource', async () => {
      const scenario = stateful(
        (agent, id) => agent.get(`/api/__fixture/notes/${id}`),
        () => [],
      );
      await expect(expectIsolated(t.app, users, scenario)).rejects.toThrow(
        /owner list must hold the id/,
      );
    });
  });
});
