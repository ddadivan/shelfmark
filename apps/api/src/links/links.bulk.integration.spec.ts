import {
  FOLDER_DELETE_MODE,
  LINK_LIMIT,
  LINKS_BATCH_ENDPOINT,
  LINKS_BATCH_ERROR_MESSAGE,
  LINKS_BATCH_UPDATE_ENDPOINT,
  TAG_ERROR_MESSAGE,
  TRASH_ENDPOINT,
  TRASH_ITEM_KIND,
  type DeleteLinksBatchResponse,
  type FolderResponse,
  type ListLinksResponse,
  type ListTagsResponse,
  type ListTrashResponse,
  type UpdateLinksBatchResponse,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { randomUuidV7 } from '../../test-utils/isolation/random-uuid-v7';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';

const FOLDERS = '/api/folders';
const LINKS = '/api/links';

describe('links API: bulk delete and bulk update', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
    b = asUser(t.app, users.intruder);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const ownerId = (): string => users.owner.userId;
  const intruderId = (): string => users.intruder.userId;

  async function folder(name: string, agent: TestAgent = a): Promise<string> {
    const res = await agent.post(FOLDERS).send({ name }).expect(201);
    return (res.body as FolderResponse).id;
  }

  const link = (options: Parameters<typeof seedLink>[2] = {}, userId = ownerId()) =>
    seedLink(t.db.prisma, userId, options);
  const row = (id: string) =>
    t.db.prisma.link.findUniqueOrThrow({
      where: { id },
      include: { tags: { select: { tag: { select: { name: true } } } } },
    });
  const tagsOf = async (id: string): Promise<string[]> =>
    (await row(id)).tags.map((entry) => entry.tag.name).sort();

  const update = (body: object, agent: TestAgent = a) =>
    agent.post(LINKS_BATCH_UPDATE_ENDPOINT).send(body);
  const remove = (ids: string[], agent: TestAgent = a) =>
    agent.post(LINKS_BATCH_ENDPOINT.Delete).send({ ids });

  describe('POST /api/links/batch/delete', () => {
    it('moves the links to Trash with one shared deleted_at; each is its own Trash entry', async () => {
      const work = await folder('Work');
      const first = await link({ folderId: work, title: 'First' });
      const second = await link({ title: 'Second' });
      const kept = await link({ title: 'Kept' });

      const res = await remove([first, second]).expect(200);
      expect(res.body as DeleteLinksBatchResponse).toEqual({ deleted: 2 });

      const [r1, r2, r3] = await Promise.all([row(first), row(second), row(kept)]);
      expect(r1.deletedAt).not.toBeNull();
      expect(r1.deletedAt?.getTime()).toBe(r2.deletedAt?.getTime());
      expect(r3.deletedAt).toBeNull();

      const list = (await a.get(LINKS).expect(200)).body as ListLinksResponse;
      expect(list.items.map((item) => item.id)).toEqual([kept]);
      const trash = (await a.get(TRASH_ENDPOINT.Base).expect(200)).body as ListTrashResponse;
      expect(trash.items.map((item) => item.id).sort()).toEqual([first, second].sort());
    });

    it('restores through Trash restore (the Undo path), back into the folder', async () => {
      const work = await folder('Work');
      const first = await link({ folderId: work });
      const second = await link();
      await remove([first, second]).expect(200);

      await a
        .post(TRASH_ENDPOINT.Restore)
        .send({
          items: [
            { kind: TRASH_ITEM_KIND.Link, id: first },
            { kind: TRASH_ITEM_KIND.Link, id: second },
          ],
        })
        .expect(200);
      const [r1, r2] = await Promise.all([row(first), row(second)]);
      expect(r1.deletedAt).toBeNull();
      expect(r1.folderId).toBe(work);
      expect(r2.deletedAt).toBeNull();
    });

    it('clears pins and keeps updated_at', async () => {
      const work = await folder('Work');
      const id = await link({ folderId: work });
      await a.patch(`${LINKS}/${id}`).send({ pinnedInFolder: true }).expect(200);
      const before = await row(id);
      await remove([id]).expect(200);
      const after = await row(id);
      expect(after.pinnedInFolderAt).toBeNull();
      expect(after.pinnedPosition).toBeNull();
      expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
    });

    it('ignores missing, trashed and foreign ids and counts only what moved', async () => {
      const own = await link();
      const foreign = await link({}, intruderId());
      await remove([own]).expect(200);
      const res = await remove([own, foreign, randomUuidV7()]).expect(200);
      expect(res.body).toEqual({ deleted: 0 });
      expect((await row(foreign)).deletedAt).toBeNull();
    });

    it('validates the body: 1 to 100 distinct UUIDs', async () => {
      await remove([]).expect(400);
      await remove(['not-a-uuid']).expect(400);
      const id = randomUuidV7();
      await remove([id, id]).expect(400);
      const many = Array.from({ length: LINK_LIMIT.BatchMax + 1 }, () => randomUuidV7());
      await remove(many).expect(400);
      await a
        .post(LINKS_BATCH_ENDPOINT.Delete)
        .send({ ids: [id], extra: 1 })
        .expect(400);
      await remove(many.slice(0, LINK_LIMIT.BatchMax)).expect(200);
    });

    it('needs a session', async () => {
      await anonymous(t.app)
        .post(LINKS_BATCH_ENDPOINT.Delete)
        .send({ ids: [randomUuidV7()] })
        .expect(401);
    });
  });

  describe('POST /api/links/batch/update', () => {
    it('moves links to a folder and back to Unsorted, unpinning from the old folder', async () => {
      const work = await folder('Work');
      const home = await folder('Home');
      const pinned = await link({ folderId: work, title: 'Pinned' });
      await a.patch(`${LINKS}/${pinned}`).send({ pinnedInFolder: true }).expect(200);
      const loose = await link({ title: 'Loose' });

      const res = await update({ ids: [loose, pinned], folderId: home }).expect(200);
      const body = res.body as UpdateLinksBatchResponse;
      expect(body.updated).toBe(2);
      expect(body.links.map((item) => item.id)).toEqual([loose, pinned]);
      expect(body.links.every((item) => item.folderId === home)).toBe(true);
      expect((await row(pinned)).pinnedInFolderAt).toBeNull();

      await update({ ids: [loose], folderId: null }).expect(200);
      expect((await row(loose)).folderId).toBeNull();
    });

    it('keeps the in-folder pin when the move targets the same folder', async () => {
      const work = await folder('Work');
      const pinned = await link({ folderId: work });
      await a.patch(`${LINKS}/${pinned}`).send({ pinnedInFolder: true }).expect(200);
      await update({ ids: [pinned], folderId: work }).expect(200);
      expect((await row(pinned)).pinnedInFolderAt).not.toBeNull();
    });

    it('refuses a foreign, missing or trashed folder with 404 and changes nothing', async () => {
      const id = await link();
      const foreign = await folder('Theirs', b);
      await update({ ids: [id], folderId: foreign }).expect(404);
      await update({ ids: [id], folderId: randomUuidV7() }).expect(404);
      const gone = await folder('Gone');
      await a.delete(`${FOLDERS}/${gone}?mode=${FOLDER_DELETE_MODE.MoveToUnsorted}`).expect(204);
      await update({ ids: [id], folderId: gone }).expect(404);
      expect((await row(id)).folderId).toBeNull();
    });

    it('adds tags to every link, creating new ones and skipping tags a link already has', async () => {
      const first = await link({ tags: ['angular'] });
      const second = await link();
      const res = await update({ ids: [first, second], addTags: ['Angular', 'new tag'] }).expect(
        200,
      );
      expect((res.body as UpdateLinksBatchResponse).links[1]?.tags.sort()).toEqual([
        'angular',
        'new-tag',
      ]);
      expect(await tagsOf(first)).toEqual(['angular', 'new-tag']);
      expect(await tagsOf(second)).toEqual(['angular', 'new-tag']);
      const tags = (await a.get('/api/tags').expect(200)).body as ListTagsResponse;
      expect(tags.items.map((tag) => tag.name).sort()).toEqual(['angular', 'new-tag']);
    });

    it('removes tags from every link case-insensitively and keeps the tags themselves', async () => {
      const first = await link({ tags: ['angular', 'css'] });
      const second = await link({ tags: ['Angular'] });
      await update({ ids: [first, second], removeTags: ['ANGULAR', 'unknown'] }).expect(200);
      expect(await tagsOf(first)).toEqual(['css']);
      expect(await tagsOf(second)).toEqual([]);
      const tags = (await a.get('/api/tags').expect(200)).body as ListTagsResponse;
      expect(tags.items.map((tag) => tag.name).sort()).toEqual(['angular', 'css']);
    });

    it('does not take a tag off a link of another user with the same tag name', async () => {
      const own = await link({ tags: ['shared'] });
      const theirs = await link({ tags: ['shared'] }, intruderId());
      await update({ ids: [own, theirs], removeTags: ['shared'] }).expect(200);
      expect(await tagsOf(theirs)).toEqual(['shared']);
      expect(await tagsOf(own)).toEqual([]);
    });

    it('escapes LIKE wildcards when matching names to remove', async () => {
      const id = await link({ tags: ['a_b', 'axb'] });
      await update({ ids: [id], removeTags: ['a_b'] }).expect(200);
      expect(await tagsOf(id)).toEqual(['axb']);
    });

    it('refuses more than 20 tags on a link (409) and rolls everything back', async () => {
      const full = await link({
        tags: Array.from({ length: LINK_LIMIT.TagsMax }, (_, i) => `t${i}`),
      });
      const other = await link();
      const res = await update({ ids: [other, full], addTags: ['extra'], isFavorite: true }).expect(
        409,
      );
      expect((res.body as { message: string }).message).toBe(LINKS_BATCH_ERROR_MESSAGE.TooManyTags);
      expect(await tagsOf(other)).toEqual([]);
      expect((await row(other)).isFavorite).toBe(false);
      const tags = (await a.get('/api/tags').expect(200)).body as ListTagsResponse;
      expect(tags.items.some((tag) => tag.name === 'extra')).toBe(false);
      // A tag the full link already has fits.
      await update({ ids: [full], addTags: ['t0'] }).expect(200);
    });

    it('sets and clears favorite on every link', async () => {
      const first = await link();
      const second = await link({ isFavorite: true });
      await update({ ids: [first, second], isFavorite: true }).expect(200);
      expect((await row(first)).isFavorite).toBe(true);
      await update({ ids: [first, second], isFavorite: false }).expect(200);
      expect((await row(second)).isFavorite).toBe(false);
    });

    it('combines changes in one call', async () => {
      const work = await folder('Work');
      const id = await link({ tags: ['old'] });
      await update({
        ids: [id],
        folderId: work,
        addTags: ['new'],
        removeTags: ['old'],
        isFavorite: true,
      }).expect(200);
      const after = await row(id);
      expect(after.folderId).toBe(work);
      expect(after.isFavorite).toBe(true);
      expect(await tagsOf(id)).toEqual(['new']);
    });

    it('ignores trashed, missing and foreign links', async () => {
      const own = await link();
      const trashed = await link();
      await remove([trashed]).expect(200);
      const foreign = await link({}, intruderId());
      const res = await update({
        ids: [trashed, own, foreign, randomUuidV7()],
        isFavorite: true,
      }).expect(200);
      const body = res.body as UpdateLinksBatchResponse;
      expect(body.updated).toBe(1);
      expect(body.links.map((item) => item.id)).toEqual([own]);
      expect((await row(trashed)).isFavorite).toBe(false);
      expect((await row(foreign)).isFavorite).toBe(false);
    });

    it('answers 0 links when nothing matched', async () => {
      const res = await update({ ids: [randomUuidV7()], addTags: ['x'] }).expect(200);
      expect(res.body).toEqual({ updated: 0, links: [] });
      const tags = (await a.get('/api/tags').expect(200)).body as ListTagsResponse;
      expect(tags.items).toEqual([]);
    });

    it('validates the body', async () => {
      const id = await link();
      const nothing = await update({ ids: [id] }).expect(400);
      expect((nothing.body as { message: string }).message).toBe(
        LINKS_BATCH_ERROR_MESSAGE.NothingToChange,
      );
      const both = await update({ ids: [id], addTags: ['x'], removeTags: ['X'] }).expect(400);
      expect((both.body as { message: string }).message).toBe(
        LINKS_BATCH_ERROR_MESSAGE.TagAddedAndRemoved,
      );
      const long = await update({ ids: [id], addTags: ['a'.repeat(60)] }).expect(400);
      expect((long.body as { message: string }).message).toBe(TAG_ERROR_MESSAGE.NameTooLong);
      await update({ ids: [], isFavorite: true }).expect(400);
      await update({ ids: [id, id], isFavorite: true }).expect(400);
      await update({ ids: ['x'], isFavorite: true }).expect(400);
      await update({ ids: [id], isFavorite: 'yes' }).expect(400);
      await update({ ids: [id], folderId: 'nope' }).expect(400);
      await update({ ids: [id], addTags: ['bad\u0000'] }).expect(400);
      await update({ ids: [id], addTags: Array.from({ length: 21 }, (_, i) => `t${i}`) }).expect(
        400,
      );
      await update({ ids: [id], isFavorite: true, userId: intruderId() }).expect(400);
      const many = Array.from({ length: LINK_LIMIT.BatchMax + 1 }, () => randomUuidV7());
      await update({ ids: many, isFavorite: true }).expect(400);
      await update({ ids: many.slice(0, LINK_LIMIT.BatchMax), isFavorite: true }).expect(200);
    });

    it('needs a session', async () => {
      await anonymous(t.app)
        .post(LINKS_BATCH_UPDATE_ENDPOINT)
        .send({ ids: [randomUuidV7()], isFavorite: true })
        .expect(401);
    });
  });

  describe('data isolation', () => {
    it("never deletes, moves, tags or favorites another user's links", async () => {
      const theirs = await link({ tags: ['secret'] }, ownerId());
      const ownFolder = await folder('Mine', b);

      expect((await remove([theirs], b).expect(200)).body).toEqual({ deleted: 0 });
      const res = await update(
        { ids: [theirs], folderId: ownFolder, addTags: ['pwned'], isFavorite: true },
        b,
      ).expect(200);
      expect(res.body).toEqual({ updated: 0, links: [] });
      await update({ ids: [theirs], removeTags: ['secret'] }, b).expect(200);

      const after = await row(theirs);
      expect(after.deletedAt).toBeNull();
      expect(after.folderId).toBeNull();
      expect(after.isFavorite).toBe(false);
      expect(await tagsOf(theirs)).toEqual(['secret']);
      // The intruder's tag list does not grow from a request that matched nothing.
      const tags = (await b.get('/api/tags').expect(200)).body as ListTagsResponse;
      expect(tags.items).toEqual([]);
    });

    it("never moves own links into another user's folder", async () => {
      const id = await link({}, intruderId());
      const theirs = await folder('Theirs', a);
      await update({ ids: [id], folderId: theirs }, b).expect(404);
    });
  });
});
