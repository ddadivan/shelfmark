import { LINK_LIMIT } from '@shelfmark/contracts';
import type { TabEntry } from '../models/tab-entry.interface';
import { toBatchRequest } from './to-batch-request';

const entry = (n: number, extra: Partial<TabEntry> = {}): TabEntry => ({
  key: `https://a.test/${n}`,
  tabId: n,
  url: `https://a.test/${n}`,
  title: `Title ${n}`,
  titleFromTab: true,
  host: 'a.test',
  letter: 'A',
  faviconUrl: null,
  saved: false,
  idempotencyKey: `key-${n}`,
  ...extra,
});

const NONE = { draftId: null, folderId: null, tags: [] as string[] };

describe('toBatchRequest', () => {
  it('sends url, title and the idempotency key of every tab, and the shared folder and tags', () => {
    const body = toBatchRequest(
      [entry(1), entry(2)],
      { folderId: 'f1', tags: ['read'] },
      () => NONE,
    );
    expect(body).toEqual({
      items: [
        { url: 'https://a.test/1', title: 'Title 1', idempotencyKey: 'key-1' },
        { url: 'https://a.test/2', title: 'Title 2', idempotencyKey: 'key-2' },
      ],
      folderId: 'f1',
      tags: ['read'],
      applyRules: true,
    });
  });

  it('leaves out folder and tags of the batch when there are none', () => {
    const body = toBatchRequest([entry(1)], { folderId: null, tags: [] }, () => NONE);
    expect(body).not.toHaveProperty('folderId');
    expect(body).not.toHaveProperty('tags');
  });

  it('sends no title for a tab without a usable one, and cuts a long title', () => {
    const body = toBatchRequest(
      [entry(1, { titleFromTab: false }), entry(2, { title: 'x'.repeat(500) })],
      { folderId: null, tags: [] },
      () => NONE,
    );
    expect(body.items[0]).not.toHaveProperty('title');
    expect(body.items[1]?.title).toHaveLength(LINK_LIMIT.TitleMax);
  });

  it('sends the favicon hint only for an http(s) address', () => {
    const body = toBatchRequest(
      [entry(1, { faviconUrl: 'https://a.test/i.png' }), entry(2)],
      { folderId: null, tags: [] },
      () => NONE,
    );
    expect(body.items[0]?.faviconUrl).toBe('https://a.test/i.png');
    expect(body.items[1]).not.toHaveProperty('faviconUrl');
  });

  it('gives a sorted tab its folder, its tags with "Tags for all" and its draft id', () => {
    const body = toBatchRequest(
      [entry(1), entry(2)],
      { folderId: 'shared', tags: ['all', 'Signals'] },
      (e) =>
        e.tabId === 1 ? { draftId: 'd1', folderId: 'f-ai', tags: ['signals', 'forms'] } : NONE,
    );
    expect(body.items[0]).toMatchObject({
      folderId: 'f-ai',
      tags: ['signals', 'forms', 'all'],
      aiDraftId: 'd1',
    });
    expect(body.items[1]).not.toHaveProperty('folderId');
    expect(body.items[1]).not.toHaveProperty('tags');
    expect(body.folderId).toBe('shared');
  });

  it('keeps applyRules on while some tab is left open, off when every tab has its own values', () => {
    const own = { draftId: 'd', folderId: 'f', tags: ['t'] };
    const some = toBatchRequest([entry(1), entry(2)], { folderId: null, tags: [] }, (e) =>
      e.tabId === 1 ? own : NONE,
    );
    const all = toBatchRequest([entry(1)], { folderId: null, tags: [] }, () => own);
    expect(some.applyRules).toBe(true);
    expect(all.applyRules).toBe(false);
  });

  it('merges tags without repeats and within the tag limit', () => {
    const shared = Array.from({ length: 25 }, (_, i) => `t${i}`);
    const body = toBatchRequest([entry(1)], { folderId: null, tags: shared }, () => ({
      draftId: null,
      folderId: null,
      tags: ['T0', 'extra'],
    }));
    const tags = body.items[0]?.tags ?? [];
    expect(tags).toHaveLength(LINK_LIMIT.TagsMax);
    expect(tags.slice(0, 3)).toEqual(['T0', 'extra', 't1']);
  });
});
