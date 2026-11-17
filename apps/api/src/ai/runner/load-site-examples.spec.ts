import { createTestDatabase } from '../../../test-utils/test-database';
import type { TestDatabase } from '../../../test-utils/models/test-database.interface';
import { seedLink } from '../../../test-utils/seed-link';
import { loadSiteExamples } from './load-site-examples';

describe('loadSiteExamples', () => {
  let database: TestDatabase;
  let userId: string;
  let otherId: string;
  let minutes = 0;

  beforeAll(async () => {
    database = await createTestDatabase();
  });

  beforeEach(async () => {
    userId = (await database.prisma.user.create({ data: { name: 'A', email: 'a@example.test' } }))
      .id;
    otherId = (await database.prisma.user.create({ data: { name: 'B', email: 'b@example.test' } }))
      .id;
  });

  afterEach(async () => {
    await database.truncateAll();
  });

  afterAll(async () => {
    await database.close();
  });

  const folder = async (owner: string, name: string) =>
    (await database.prisma.folder.create({ data: { userId: owner, name } })).id;
  const link = (
    owner: string,
    url: string,
    options: { folderId?: string | null; tags?: string[] } = {},
  ) => {
    minutes += 1;
    return seedLink(database.prisma, owner, {
      url,
      ...options,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, minutes)),
    });
  };

  it('answers up to three of the user’s other links of the site, newest first, keys and tags only', async () => {
    const videos = await folder(userId, 'Videos');
    const talks = await folder(userId, 'Talks');
    await link(userId, 'https://youtube.com/1', { folderId: talks });
    await link(userId, 'https://www.youtube.com/2', { folderId: videos, tags: ['b', 'a'] });
    await link(userId, 'https://youtube.com/3', { tags: ['music'] });
    await link(userId, 'https://youtube.com/4');
    await link(userId, 'https://m.youtube.com/5', { folderId: videos });
    await link(userId, 'https://notyoutube.com/6', { folderId: videos });
    const self = await link(userId, 'https://youtube.com/7', { folderId: videos });
    const keys = new Map([
      ['f1', videos],
      ['f2', talks],
    ]);
    const [examples] = await loadSiteExamples(
      database.prisma,
      userId,
      [{ url: 'https://youtube.com/7', linkId: self }],
      keys,
    );
    expect(examples).toEqual([
      { folderKey: null, tags: ['music'] },
      { folderKey: 'f1', tags: ['a', 'b'] },
      { folderKey: 'f2', tags: [] },
    ]);
  });

  it('leaves out what AI applied and the user did not confirm, and folders outside the prompt', async () => {
    const videos = await folder(userId, 'Videos');
    const hidden = await folder(userId, 'Hidden');
    const auto = await link(userId, 'https://youtube.com/1', { folderId: videos, tags: ['ai'] });
    await database.prisma.linkSuggestion.createMany({
      data: [
        { userId, linkId: auto, kind: 'folder', folderId: videos, state: 'auto-applied' },
        { userId, linkId: auto, kind: 'tag', tagName: 'ai', state: 'auto-applied' },
      ],
    });
    await link(userId, 'https://youtube.com/2', { folderId: hidden });
    const [examples] = await loadSiteExamples(
      database.prisma,
      userId,
      [{ url: 'https://youtube.com/3', linkId: null }],
      new Map([['f1', videos]]),
    );
    expect(examples).toEqual([]);
  });

  it("never reads another user's links, and answers per target in one call", async () => {
    const theirs = await folder(otherId, 'Theirs');
    await link(otherId, 'https://youtube.com/1', { folderId: theirs, tags: ['secret'] });
    await link(userId, 'https://github.com/x', { tags: ['code'] });
    const result = await loadSiteExamples(
      database.prisma,
      userId,
      [
        { url: 'https://youtube.com/2', linkId: null },
        { url: 'https://github.com/y', linkId: null },
        { url: 'mailto:someone@example.test', linkId: null },
      ],
      new Map(),
    );
    expect(result).toEqual([[], [{ folderKey: null, tags: ['code'] }], []]);
  });

  it('answers nothing without an http(s) host', async () => {
    expect(
      await loadSiteExamples(
        database.prisma,
        userId,
        [{ url: 'ftp://x', linkId: null }],
        new Map(),
      ),
    ).toEqual([[]]);
  });
});
