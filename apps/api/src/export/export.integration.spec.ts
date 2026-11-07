import type { ExportDocument } from '@shelfmark/contracts';
import { EXPORT_SCHEMA_VERSION } from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../test-utils/isolation/expect-isolated';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';

const SCRIPT = '<script>alert(1)</script>';

describe('GET /api/export', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;

  beforeAll(async () => {
    t = await createAuthTestApp();
    users = await createIsolationUsers(t);
  });

  afterAll(async () => {
    await t.close();
  });

  beforeEach(async () => {
    const { prisma } = t.db;
    await prisma.link.deleteMany();
    await prisma.folder.deleteMany();
    await prisma.tag.deleteMany();
  });

  const owner = () => asUser(t.app, users.owner);
  const intruder = () => asUser(t.app, users.intruder);

  async function seed(userId: string) {
    const { prisma } = t.db;
    const work = await prisma.folder.create({ data: { userId, name: 'Work' } });
    const sub = await prisma.folder.create({
      data: { userId, name: 'Docs "x"', parentId: work.id },
    });
    const other = await prisma.folder.create({ data: { userId, name: 'Other' } });
    const tagA = await prisma.tag.create({ data: { userId, name: 'Alpha' } });
    const tagB = await prisma.tag.create({ data: { userId, name: 'beta' } });
    const mk = (data: {
      url: string;
      title: string;
      folderId?: string;
      note?: string;
      isFavorite?: boolean;
      tags?: string[];
    }) =>
      prisma.link.create({
        data: {
          userId,
          url: data.url,
          normalizedUrl: data.url,
          title: data.title,
          note: data.note,
          isFavorite: data.isFavorite ?? false,
          folderId: data.folderId,
          tags: { create: (data.tags ?? []).map((tagId) => ({ tagId })) },
        },
      });
    await mk({ url: 'https://root.example/', title: 'Root', tags: [tagA.id, tagB.id] });
    await mk({
      url: 'https://work.example/a',
      title: 'Work A',
      folderId: work.id,
      isFavorite: true,
      note: 'line one',
      tags: [tagA.id],
    });
    await mk({ url: 'https://sub.example/100%_done', title: 'Sub', folderId: sub.id });
    await mk({ url: 'https://other.example/', title: 'Other link', folderId: other.id });
    return { work, sub, other };
  }

  it('exports JSON with folders, tags, notes, favorite and dates, with the right headers', async () => {
    await seed(users.owner.userId);
    const res = await owner().get('/api/export?format=json').expect(200);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    expect(res.headers['content-disposition']).toMatch(
      /^attachment; filename="shelfmark-\d{4}-\d{2}-\d{2}\.json"$/,
    );
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    const doc = res.body as ExportDocument;
    expect(doc.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(doc.folders.map((f) => f.path)).toEqual([['Other'], ['Work'], ['Work', 'Docs "x"']]);
    expect(doc.links).toHaveLength(4);
    const root = doc.links.find((l) => l.title === 'Root');
    expect(root).toMatchObject({ folderPath: null, tags: ['Alpha', 'beta'], note: null });
    const a = doc.links.find((l) => l.title === 'Work A');
    expect(a).toMatchObject({
      folderPath: ['Work'],
      isFavorite: true,
      note: 'line one',
      tags: ['Alpha'],
      lastOpenedAt: null,
    });
    expect(Date.parse(a?.createdAt ?? '')).not.toBeNaN();
  });

  it('exports an empty library as valid files', async () => {
    const json = await owner().get('/api/export?format=json').expect(200);
    expect(json.body).toMatchObject({ folders: [], links: [] });
    const html = await owner().get('/api/export?format=html').expect(200);
    expect(html.text).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
    expect(html.text).not.toContain('<A ');
  });

  it('exports the Netscape bookmarks HTML with nested folders', async () => {
    await seed(users.owner.userId);
    const res = await owner().get('/api/export?format=html').expect(200);
    expect(res.headers['content-type']).toMatch(/^text\/html/);
    expect(res.headers['content-disposition']).toMatch(/filename="shelfmark-[\d-]+\.html"/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    const html = res.text;
    expect(html.startsWith('<!DOCTYPE NETSCAPE-Bookmark-file-1>')).toBe(true);
    expect(html).toContain('<DT><H3');
    expect(html).toContain('>Work</H3>');
    expect(html).toContain('>Docs &quot;x&quot;</H3>');
    expect(html).toContain('TAGS="Alpha,beta"');
    expect(html).toContain('<DD>line one');
    expect(html.indexOf('Work A')).toBeLessThan(html.indexOf('Docs'));
    // Unsorted links come before folders, links nest inside their folder.
    expect(html.indexOf('>Root</A>')).toBeLessThan(html.indexOf('>Other</H3>'));
    expect(html.match(/<A /g)).toHaveLength(4);
  });

  it('escapes user content in the HTML', async () => {
    const { prisma } = t.db;
    const userId = users.owner.userId;
    const folder = await prisma.folder.create({ data: { userId, name: SCRIPT } });
    const tag = await prisma.tag.create({ data: { userId, name: '"><img>' } });
    const mk = (url: string, title: string, note?: string) =>
      prisma.link.create({
        data: {
          userId,
          url,
          normalizedUrl: url,
          title,
          note,
          folderId: folder.id,
          tags: { create: [{ tagId: tag.id }] },
        },
      });
    await mk('https://ok.example/?a=1&b="2"', SCRIPT, `<b onclick='x'>${SCRIPT}</b>`);
    const html = (await owner().get('/api/export?format=html').expect(200)).text;
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img>');
    expect(html).not.toContain('<b onclick');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('HREF="https://ok.example/?a=1&amp;b=%222%22"');
    expect(html).toContain('TAGS="&quot;&gt;&lt;img&gt;"');
    // The database CHECK already refuses non-http(s) URLs; `safeHref` (unit tested) is the second layer.
    expect(html.match(/<A /g)).toHaveLength(1);
  });

  it('filters by folder including its subfolders', async () => {
    const { work } = await seed(users.owner.userId);
    const doc = (await owner().get(`/api/export?format=json&folderId=${work.id}`).expect(200))
      .body as ExportDocument;
    expect(doc.links.map((l) => l.title).sort()).toEqual(['Sub', 'Work A']);
    expect(doc.folders.map((f) => f.path)).toEqual([['Work'], ['Work', 'Docs "x"']]);
    const html = (await owner().get(`/api/export?format=html&folderId=${work.id}`).expect(200))
      .text;
    expect(html).toContain('>Work</H3>');
    expect(html).not.toContain('Root');
    expect(html).not.toContain('>Other</H3>');
  });

  it('filters by tags (AND, case-insensitive) and prunes empty folders', async () => {
    await seed(users.owner.userId);
    const one = (await owner().get('/api/export?format=json&tag=alpha').expect(200))
      .body as ExportDocument;
    expect(one.links.map((l) => l.title).sort()).toEqual(['Root', 'Work A']);
    expect(one.folders.map((f) => f.path)).toEqual([['Work']]);
    const both = (await owner().get('/api/export?format=json&tag=ALPHA&tag=Beta').expect(200))
      .body as ExportDocument;
    expect(both.links.map((l) => l.title)).toEqual(['Root']);
    expect(both.folders).toEqual([]);
  });

  it('searches title, note and URL and treats wildcards literally', async () => {
    await seed(users.owner.userId);
    const titles = async (q: string): Promise<string[]> =>
      (
        (await owner().get('/api/export').query({ format: 'json', q }).expect(200))
          .body as ExportDocument
      ).links
        .map((l) => l.title)
        .sort();
    expect(await titles('WORK A')).toEqual(['Work A']);
    expect(await titles('line ONE')).toEqual(['Work A']);
    expect(await titles('other.example')).toEqual(['Other link']);
    expect(await titles('100%_done')).toEqual(['Sub']);
    expect(await titles('%')).toEqual(['Sub']);
    expect(await titles('_')).toEqual(['Sub']);
    expect(await titles('nothing-matches')).toEqual([]);
  });

  it('combines folder, tag and search filters', async () => {
    const { work } = await seed(users.owner.userId);
    const doc = (
      await owner().get(`/api/export?format=json&folderId=${work.id}&tag=alpha&q=work`).expect(200)
    ).body as ExportDocument;
    expect(doc.links.map((l) => l.title)).toEqual(['Work A']);
  });

  it('streams more links than one batch', async () => {
    const { prisma } = t.db;
    const userId = users.owner.userId;
    await prisma.link.createMany({
      data: Array.from({ length: 1100 }, (_, i) => ({
        userId,
        url: `https://bulk.example/${i}`,
        normalizedUrl: `https://bulk.example/${i}`,
        title: `Bulk ${i}`,
      })),
    });
    const doc = (await owner().get('/api/export?format=json').expect(200)).body as ExportDocument;
    expect(new Set(doc.links.map((l) => l.url)).size).toBe(1100);
    const html = (await owner().get('/api/export?format=html').expect(200)).text;
    expect(html.match(/<A /g)).toHaveLength(1100);
  });

  it('validates the query', async () => {
    await owner().get('/api/export').expect(400);
    await owner().get('/api/export?format=xml').expect(400);
    await owner().get('/api/export?format=json&folderId=nope').expect(400);
    await owner().get('/api/export?format=json&extra=1').expect(400);
    await owner().get('/api/export?format=json&tag=a&tag=b&tag=c&tag=d&tag=e&tag=f').expect(400);
    await owner()
      .get(`/api/export?format=json&q=${'x'.repeat(201)}`)
      .expect(400);
  });

  it('never exports another user data', async () => {
    await seed(users.owner.userId);
    const doc = (await intruder().get('/api/export?format=json').expect(200))
      .body as ExportDocument;
    expect(doc.links).toEqual([]);
    expect(doc.folders).toEqual([]);
    const html = (await intruder().get('/api/export?format=html').expect(200)).text;
    expect(html).not.toContain('example');
    expect(html).not.toContain('Work');
  });

  it('does not match tags of another user with the same name', async () => {
    const { prisma } = t.db;
    await seed(users.owner.userId);
    const tag = await prisma.tag.create({ data: { userId: users.intruder.userId, name: 'Alpha' } });
    await prisma.link.create({
      data: {
        userId: users.intruder.userId,
        url: 'https://mine.example/',
        normalizedUrl: 'https://mine.example/',
        title: 'Mine',
        tags: { create: [{ tagId: tag.id }] },
      },
    });
    const doc = (await intruder().get('/api/export?format=json&tag=alpha').expect(200))
      .body as ExportDocument;
    expect(doc.links.map((l) => l.title)).toEqual(['Mine']);
  });

  it('requires a session', async () => {
    const res = await anonymous(t.app).get('/api/export?format=json').expect(401);
    expect(Object.keys(res.body).sort()).toEqual(['error', 'message', 'requestId', 'statusCode']);
  });

  it('is data-isolated: a foreign folderId is a 404 like a missing one', async () => {
    await expectIsolated(t.app, users, {
      create: async () => {
        const folder = await t.db.prisma.folder.create({
          data: { userId: users.owner.userId, name: 'Private' },
        });
        return folder.id;
      },
      // HTML: the JSON file carries `exportedAt`, which differs between two calls.
      read: (agent, id) => agent.get(`/api/export?format=html&folderId=${id}`),
      skip: {
        update: 'export is read-only',
        remove: 'export is read-only',
        list: 'the export is not a list of resources; see the leak tests above',
        reference: 'the folder id is the read filter itself, covered by read',
      },
    });
  });
});
