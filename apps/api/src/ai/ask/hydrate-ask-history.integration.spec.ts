import { createAuthTestApp } from '../../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../../test-utils/isolation/create-isolation-users';
import type { AuthTestApp } from '../../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../../test-utils/models/isolation-users.interface';
import { seedLink } from '../../../test-utils/seed-link';
import { PrismaService } from '../../prisma/prisma.service';
import { hydrateAskHistory } from './hydrate-ask-history';
import { LinkRefs } from './tools/link-refs';

describe('hydrateAskHistory (ADR 0055 point 6, data isolation)', () => {
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

  it("re-reads links for the session user: another user's and trashed ids drop out with their markers", async () => {
    const owner = users.owner.userId;
    const own = await seedLink(t.db.prisma, owner, { title: 'Own signals guide' });
    const trashed = await seedLink(t.db.prisma, owner, { title: 'Trashed one' });
    await t.db.prisma.link.update({ where: { id: trashed }, data: { deletedAt: new Date() } });
    const foreign = await seedLink(t.db.prisma, users.intruder.userId, {
      title: 'Intruder secret',
    });
    const refs = new LinkRefs();
    const turns = await hydrateAskHistory(
      t.app.get(PrismaService),
      owner,
      [
        {
          question: 'find signals',
          answer: 'Mine [1], theirs [2], gone [3], a year [2024] and [7].',
          links: [
            { n: 1, id: own },
            { n: 2, id: foreign },
            { n: 3, id: trashed },
          ],
        },
        { question: 'again', answer: 'Still [1].', links: [{ n: 1, id: own }] },
      ],
      refs,
      false,
    );
    expect(turns[0]?.answer).toBe('Mine [1], theirs , gone , a year [2024] and [7].');
    expect(turns[0]?.links.map((link) => link.title)).toEqual(['Own signals guide']);
    expect(turns[1]?.answer).toBe('Still [1].');
    expect(refs.size).toBe(1);
    expect(refs.idFor(1)).toBe(own);
    expect(JSON.stringify(turns)).not.toContain('Intruder');
  });

  it('numbers refs in turn order and maps each turn’s own markers', async () => {
    const owner = users.owner.userId;
    const a = await seedLink(t.db.prisma, owner, { title: 'A' });
    const b = await seedLink(t.db.prisma, owner, { title: 'B' });
    const refs = new LinkRefs();
    const turns = await hydrateAskHistory(
      t.app.get(PrismaService),
      owner,
      [
        { question: 'one', answer: 'B [1].', links: [{ n: 1, id: b }] },
        {
          question: 'two',
          answer: 'A [1] and B [2].',
          links: [
            { n: 1, id: a },
            { n: 2, id: b },
          ],
        },
      ],
      refs,
      false,
    );
    expect(turns.map((turn) => turn.answer)).toEqual(['B [1].', 'A [2] and B [1].']);
    expect(turns[1]?.links.map((link) => link.ref)).toEqual([2, 1]);
  });
});
