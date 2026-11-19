import { randomUUID } from 'node:crypto';
import {
  IMPORT_ENDPOINT,
  IMPORT_SOURCE,
  type ImportCheckResponse,
  type ListImportsResponse,
  type StartImportResponse,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../test-utils/isolation/expect-isolated';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';

const BASE = IMPORT_ENDPOINT.Base;
const startBody = { source: IMPORT_SOURCE.Browser, fileName: 'bookmarks.html', folders: [] };

describe('imports API: data isolation (#387)', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  it('imports: batch, finish and undo of a foreign import are 404, list never shows it', async () => {
    // No read by id: the replay of a saved batch (same key) is the 200 "read" of the owner.
    const key = randomUUID();
    const batch = { items: [{ url: 'https://owner.test/a', idempotencyKey: key }] };
    await expectIsolated(t.app, users, {
      create: async (owner) => {
        const id = (
          (await owner.post(BASE).send(startBody).expect(201)).body as StartImportResponse
        ).id;
        await owner.post(`${BASE}/${id}${IMPORT_ENDPOINT.Links}`).send(batch).expect(200);
        return id;
      },
      read: (agent, id) => agent.post(`${BASE}/${id}${IMPORT_ENDPOINT.Links}`).send(batch),
      update: (agent, id) =>
        agent.post(`${BASE}/${id}${IMPORT_ENDPOINT.Finish}`).send({ skipped: 99, failed: 99 }),
      remove: (agent, id) => agent.post(`${BASE}/${id}${IMPORT_ENDPOINT.Undo}`),
      list: {
        request: (agent) => agent.get(BASE),
        ids: (body) => (body as ListImportsResponse).items.map((entry) => entry.id),
      },
      reference: (agent, id) =>
        agent
          .post(`${BASE}/${id}${IMPORT_ENDPOINT.Links}`)
          .send({ items: [{ url: 'https://x.test/', idempotencyKey: randomUUID() }] }),
    });
  });

  it('the owner import is still open and unchanged after the intruder attempts', async () => {
    const owner = asUser(t.app, users.owner);
    const intruder = asUser(t.app, users.intruder);
    const started = (await owner.post(BASE).send(startBody).expect(201))
      .body as StartImportResponse;
    await intruder.post(`${BASE}/${started.id}${IMPORT_ENDPOINT.Undo}`).expect(404);
    await intruder
      .post(`${BASE}/${started.id}${IMPORT_ENDPOINT.Finish}`)
      .send({ skipped: 1, failed: 1 })
      .expect(404);
    const row = await t.db.prisma.import.findFirstOrThrow({ where: { id: started.id } });
    expect(row).toMatchObject({ skipped: 0, failed: 0, undoneAt: null, finishedAt: null });
    expect(await t.db.prisma.link.count()).toBe(0);
  });

  it("cannot use another user's folder as target or as an item folder (404), nothing is written", async () => {
    const foreign = (
      await t.db.prisma.folder.create({ data: { userId: users.owner.userId, name: 'Private' } })
    ).id;
    const intruder = asUser(t.app, users.intruder);
    await intruder
      .post(BASE)
      .send({ ...startBody, targetFolderId: foreign })
      .expect(404);
    expect(await t.db.prisma.import.count()).toBe(0);

    const own = (await intruder.post(BASE).send(startBody).expect(201)).body as StartImportResponse;
    await intruder
      .post(`${BASE}/${own.id}${IMPORT_ENDPOINT.Links}`)
      .send({
        items: [{ url: 'https://x.test/', idempotencyKey: randomUUID(), folderId: foreign }],
      })
      .expect(404);
    expect(await t.db.prisma.link.count()).toBe(0);
  });

  it('check never reveals the links of another user', async () => {
    await seedLink(t.db.prisma, users.owner.userId, { url: 'https://secret.test/page' });
    const res = await asUser(t.app, users.intruder)
      .post(IMPORT_ENDPOINT.Check)
      .send({ urls: ['https://secret.test/page'] })
      .expect(200);
    expect((res.body as ImportCheckResponse).saved).toEqual([]);
  });

  it('every route needs a session', async () => {
    const nobody = anonymous(t.app);
    await nobody.get(BASE).expect(401);
    await nobody
      .post(IMPORT_ENDPOINT.Check)
      .send({ urls: ['https://x.test/'] })
      .expect(401);
    await nobody.post(BASE).send(startBody).expect(401);
  });

  it('batch tags of one user never touch the tags of another user', async () => {
    await t.db.prisma.tag.create({ data: { userId: users.owner.userId, name: 'shared' } });
    const intruder = asUser(t.app, users.intruder);
    const started = (await intruder.post(BASE).send(startBody).expect(201))
      .body as StartImportResponse;
    await intruder
      .post(`${BASE}/${started.id}${IMPORT_ENDPOINT.Links}`)
      .send({ items: [{ url: 'https://x.test/', idempotencyKey: randomUUID(), tags: ['shared'] }] })
      .expect(200);
    await intruder.post(`${BASE}/${started.id}${IMPORT_ENDPOINT.Undo}`).expect(200);
    const ownerTag = await t.db.prisma.tag.findFirstOrThrow({
      where: { userId: users.owner.userId, name: 'shared' },
    });
    expect(ownerTag.importId).toBeNull();
  });
});
