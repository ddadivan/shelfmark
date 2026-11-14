import { FOLDER_DELETE_MODE, RULE_ERROR_MESSAGE, type RuleResponse } from '@shelfmark/contracts';
import type { ContractScenario } from '../models/contract-scenario.interface';
import { ANY } from '../support/any.const';
import { expectEqual } from '../support/expect-equal';
import { expectError } from '../support/expect-error';
import { scenario } from '../support/scenario';

const MISSING_ID = '018f0000-0000-7000-8000-00000000dead';
const KEY_A = '018f0000-0000-7000-8000-0000000000a1';
const KEY_B = '018f0000-0000-7000-8000-0000000000b2';
const KEY_C = '018f0000-0000-7000-8000-0000000000c3';

function rule(domain: string, fields: Partial<RuleResponse> = {}) {
  return {
    id: ANY.id,
    domain,
    folderId: null,
    folderAvailable: true,
    tags: [],
    createdAt: ANY.time,
    ...fields,
  };
}

export const RULES_SCENARIOS: readonly ContractScenario[] = [
  scenario('rules', 'a new account has no rules', async ({ rules }) => {
    expectEqual(await rules.list(), { items: [] });
  }),

  scenario(
    'rules',
    'creates, lists by domain, edits and deletes rules with normalised domains and tags',
    async ({ rules, folders }) => {
      const videos = await folders.create({ name: 'Videos' });
      const youtube = await rules.create({
        domain: 'https://WWW.YouTube.com/watch?v=1',
        folderId: videos.id,
        tags: ['video', 'Video', ' long watch '],
      });
      expectEqual(
        youtube,
        rule('youtube.com', { folderId: videos.id, tags: ['video', 'long-watch'] }),
      );
      const books = await rules.create({ domain: 'bücher.de', tags: ['books'] });
      expectEqual(books, rule('xn--bcher-kva.de', { tags: ['books'] }));
      expectEqual(await rules.list(), {
        items: [
          rule('xn--bcher-kva.de', { tags: ['books'] }),
          rule('youtube.com', { folderId: videos.id, tags: ['video', 'long-watch'] }),
        ],
      });
      const edited = await rules.update(youtube.id, { domain: 'm.youtube.com', folderId: null });
      expectEqual(edited, rule('m.youtube.com', { tags: ['video', 'long-watch'] }));
      await rules.remove(books.id);
      expectEqual(
        (await rules.list()).items.map((item) => item.domain),
        ['m.youtube.com'],
      );
    },
  ),

  scenario('rules', 'refuses a domain that has a rule, www and case ignored', async ({ rules }) => {
    const created = await rules.create({ domain: 'youtube.com', tags: ['video'] });
    const taken = { status: 409, code: RULE_ERROR_MESSAGE.DomainTaken };
    await expectError(rules.create({ domain: 'WWW.YOUTUBE.COM', tags: ['x'] }), taken, 'create');
    const other = await rules.create({ domain: 'vimeo.com', tags: ['x'] });
    await expectError(rules.update(other.id, { domain: 'youtube.com' }), taken, 'rename');
    expectEqual((await rules.list()).items.length, 2);
    expectEqual(created.domain, 'youtube.com');
  }),

  scenario(
    'rules',
    'refuses a rule without folder and tags, or an invalid domain',
    async ({ rules }) => {
      await expectError(
        rules.create({ domain: 'example.com' }),
        { status: 400, code: RULE_ERROR_MESSAGE.NothingToDo },
        'nothing to do',
      );
      const created = await rules.create({ domain: 'example.com', tags: ['x'] });
      await expectError(
        rules.update(created.id, { tags: [] }),
        { status: 400, code: RULE_ERROR_MESSAGE.NothingToDo },
        'edit to nothing',
      );
      await expectError(
        rules.create({ domain: 'localhost', tags: ['x'] }),
        { status: 400 },
        'single label',
      );
      await expectError(
        rules.create({ domain: '10.0.0.1', tags: ['x'] }),
        { status: 400 },
        'IP address',
      );
    },
  ),

  scenario('rules', 'answers 404 for a missing rule or folder', async ({ rules }) => {
    const missing = { status: 404, code: RULE_ERROR_MESSAGE.NotFound };
    await expectError(rules.update(MISSING_ID, { tags: ['x'] }), missing, 'update');
    await expectError(rules.remove(MISSING_ID), missing, 'remove');
    await expectError(rules.matches(MISSING_ID), missing, 'matches');
    await expectError(
      rules.create({ domain: 'example.com', folderId: MISSING_ID }),
      { status: 404, code: RULE_ERROR_MESSAGE.FolderNotFound },
      'folder',
    );
  }),

  scenario(
    'rules',
    'fills folder and tags of a saved link unless the save chose them',
    async ({ rules, folders, links }) => {
      const videos = await folders.create({ name: 'Videos' });
      const reading = await folders.create({ name: 'Reading' });
      await rules.create({ domain: 'youtube.com', folderId: videos.id, tags: ['video'] });
      const ruled = await links.create({ url: 'https://m.youtube.com/watch?v=1', title: 'Clip' });
      expectEqual([ruled.folderId, ruled.tags], [videos.id, ['video']]);
      const chosen = await links.create({
        url: 'https://www.youtube.com/watch?v=2',
        title: 'Chosen',
        folderId: reading.id,
        tags: ['mine'],
      });
      expectEqual([chosen.folderId, chosen.tags], [reading.id, ['mine']]);
      const off = await links.create({
        url: 'https://youtube.com/watch?v=3',
        title: 'Off',
        applyRules: false,
      });
      expectEqual([off.folderId, off.tags], [null, []]);
      const lookalike = await links.create({ url: 'https://notyoutube.com/', title: 'Other' });
      expectEqual([lookalike.folderId, lookalike.tags], [null, []]);
    },
  ),

  scenario(
    'rules',
    'applies the most specific rule per item of a batch',
    async ({ rules, links }) => {
      await rules.create({ domain: 'youtube.com', tags: ['video'] });
      await rules.create({ domain: 'music.youtube.com', tags: ['music'] });
      const { links: saved } = await links.createBatch({
        items: [
          { url: 'https://music.youtube.com/a', idempotencyKey: KEY_A },
          { url: 'https://youtube.com/b', idempotencyKey: KEY_B },
          { url: 'https://example.com/c', idempotencyKey: KEY_C },
        ],
      });
      expectEqual(
        saved.map((link) => link.tags),
        [['music'], ['video'], []],
      );
    },
  ),

  scenario(
    'rules',
    'flags a rule whose folder is in Trash and still adds its tags',
    async ({ rules, folders, links }) => {
      const videos = await folders.create({ name: 'Videos' });
      await rules.create({ domain: 'youtube.com', folderId: videos.id, tags: ['video'] });
      await folders.remove(videos.id, FOLDER_DELETE_MODE.MoveToUnsorted);
      expectEqual((await rules.list()).items, [
        rule('youtube.com', { folderId: videos.id, folderAvailable: false, tags: ['video'] }),
      ]);
      const saved = await links.create({ url: 'https://youtube.com/1', title: 'Clip' });
      expectEqual([saved.folderId, saved.tags], [null, ['video']]);
    },
  ),

  scenario(
    'rules',
    'lists the links in Unsorted a rule matches, newest first',
    async ({ rules, folders, links }) => {
      const reading = await folders.create({ name: 'Reading' });
      const older = await links.create({
        url: 'https://youtube.com/1',
        title: 'Older',
        tags: ['fun'],
        applyRules: false,
      });
      const newer = await links.create({
        url: 'https://www.youtube.com/2',
        title: 'Newer',
        applyRules: false,
      });
      await links.create({ url: 'https://youtube.com/3', title: 'Filed', folderId: reading.id });
      await links.create({ url: 'https://example.com/?u=youtube.com', title: 'Other' });
      const created = await rules.create({ domain: 'youtube.com', tags: ['video'] });
      expectEqual(await rules.matches(created.id), {
        total: 2,
        items: [
          { id: newer.id, tags: [] },
          { id: older.id, tags: ['fun'] },
        ],
      });
    },
  ),
];
