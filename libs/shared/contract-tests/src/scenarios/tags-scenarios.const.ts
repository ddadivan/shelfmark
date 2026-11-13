import { TAG_ERROR_MESSAGE, TAG_LIMIT } from '@shelfmark/contracts';
import type { ContractScenario } from '../models/contract-scenario.interface';
import { expectedTag } from '../support/expected-tag';
import { expectEqual } from '../support/expect-equal';
import { expectError } from '../support/expect-error';
import { scenario } from '../support/scenario';

const MISSING_ID = '018f0000-0000-7000-8000-00000000dead';

export const TAGS_SCENARIOS: readonly ContractScenario[] = [
  scenario('tags', 'a new account has no tags', async ({ tags }) => {
    expectEqual(await tags.list(), []);
  }),

  scenario('tags', 'creates an empty tag with a normalised name', async ({ tags }) => {
    const tag = await tags.create({ name: '  Deep   Dive ' });
    expectEqual(tag, expectedTag('Deep-Dive'));
    expectEqual(await tags.list(), [tag]);
  }),

  scenario(
    'tags',
    'lists tags by link count, then name, and counts the links',
    async ({ tags, links }) => {
      await tags.create({ name: 'unused' });
      await links.create({ url: 'https://a.example/', title: 'A', tags: ['zeta', 'beta'] });
      await links.create({ url: 'https://b.example/', title: 'B', tags: ['beta'] });
      const list = await tags.list();
      expectEqual(
        list.map((tag) => [tag.name, tag.linkCount]),
        [
          ['beta', 2],
          ['zeta', 1],
          ['unused', 0],
        ],
      );
      expectEqual(list[0], expectedTag('beta', 2));
    },
  ),

  scenario('tags', 'refuses a name that is taken, ignoring case', async ({ tags }) => {
    const first = await tags.create({ name: 'News' });
    const second = await tags.create({ name: 'Other' });
    await expectError(
      tags.create({ name: 'news' }),
      { status: 409, code: TAG_ERROR_MESSAGE.NameTaken },
      'create',
    );
    await expectError(
      tags.update(second.id, { name: 'NEWS' }),
      { status: 409, code: TAG_ERROR_MESSAGE.NameTaken },
      'rename',
    );
    const recased = await tags.update(first.id, { name: 'NEWS' });
    expectEqual(recased.name, 'NEWS');
  }),

  scenario('tags', 'renames a tag on every link that has it', async ({ tags, links }) => {
    const link = await links.create({ url: 'https://a.example/', title: 'A', tags: ['old'] });
    const [tag] = await tags.list();
    const renamed = await tags.update(tag.id, { name: 'fresh' });
    expectEqual(renamed, expectedTag('fresh', 1, { id: tag.id }));
    expectEqual((await links.get(link.id)).tags, ['fresh']);
  }),

  scenario('tags', 'deletes a tag and leaves its links', async ({ tags, links }) => {
    const link = await links.create({
      url: 'https://a.example/',
      title: 'A',
      tags: ['gone', 'stay'],
    });
    const gone = (await tags.list()).find((tag) => tag.name === 'gone');
    await tags.remove(gone?.id ?? '');
    expectEqual((await links.get(link.id)).tags, ['stay']);
    expectEqual(
      (await tags.list()).map((tag) => tag.name),
      ['stay'],
    );
  }),

  scenario(
    'tags',
    'merges a tag into another and counts each link once',
    async ({ tags, links }) => {
      const both = await links.create({
        url: 'https://a.example/',
        title: 'A',
        tags: ['from', 'into'],
      });
      const onlyFrom = await links.create({
        url: 'https://b.example/',
        title: 'B',
        tags: ['from'],
      });
      const list = await tags.list();
      const from = list.find((tag) => tag.name === 'from');
      const into = list.find((tag) => tag.name === 'into');
      const merged = await tags.merge(from?.id ?? '', into?.id ?? '');
      expectEqual(merged, expectedTag('into', 2, { id: into?.id }));
      expectEqual((await links.get(both.id)).tags, ['into']);
      expectEqual((await links.get(onlyFrom.id)).tags, ['into']);
      expectEqual(
        (await tags.list()).map((tag) => tag.name),
        ['into'],
      );
    },
  ),

  scenario('tags', 'refuses to merge a tag into itself', async ({ tags }) => {
    const tag = await tags.create({ name: 'solo' });
    await expectError(
      tags.merge(tag.id, tag.id),
      { status: 400, code: TAG_ERROR_MESSAGE.MergeIntoItself },
      'merge into itself',
    );
  }),

  scenario('tags', 'answers 404 for a missing tag', async ({ tags }) => {
    const notFound = { status: 404, code: TAG_ERROR_MESSAGE.NotFound };
    const tag = await tags.create({ name: 'real' });
    await expectError(tags.update(MISSING_ID, { name: 'x' }), notFound, 'update');
    await expectError(tags.remove(MISSING_ID), notFound, 'remove');
    await expectError(tags.merge(MISSING_ID, tag.id), notFound, 'merge from');
    await expectError(tags.merge(tag.id, MISSING_ID), notFound, 'merge into');
  }),

  scenario('tags', 'rejects an empty or too long name', async ({ tags }) => {
    await expectError(tags.create({ name: '' }), { status: 400 }, 'empty');
    await expectError(tags.create({ name: '   ' }), { status: 400 }, 'blank');
    await expectError(
      tags.create({ name: 'x'.repeat(TAG_LIMIT.NameMax + 1) }),
      { status: 400 },
      'long',
    );
  }),
];
