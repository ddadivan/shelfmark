import { LINK_BATCH_ERROR_CODE } from '@shelfmark/contracts';
import { makeLink } from '../../../testing/fixtures';
import type { TabEntry } from '../models/tab-entry.interface';
import { toTabsSaveResult } from './to-tabs-save-result';

const entry = (n: number): TabEntry => ({
  key: `k${n}`,
  tabId: n,
  url: `https://a.test/${n}`,
  title: `T${n}`,
  titleFromTab: true,
  host: 'a.test',
  letter: 'A',
  faviconUrl: null,
  saved: false,
  idempotencyKey: `i${n}`,
});

describe('toTabsSaveResult', () => {
  it('splits saved and skipped tabs by the error index and collects the distinct folders', () => {
    const result = toTabsSaveResult([entry(1), entry(2), entry(3)], {
      links: [makeLink({ folderId: 'f1' }), makeLink({ folderId: 'f1' })],
      errors: [{ index: 1, url: 'https://a.test/2', code: LINK_BATCH_ERROR_CODE.UrlTooLong }],
    });
    expect(result.saved.map((e) => e.tabId)).toEqual([1, 3]);
    expect(result.skipped.map((s) => [s.entry.tabId, s.code])).toEqual([[2, 'url-too-long']]);
    expect(result.folderIds).toEqual(['f1']);
  });

  it('lists several folders (and Unsorted as null) when AI spread the links', () => {
    const result = toTabsSaveResult([entry(1), entry(2)], {
      links: [makeLink({ folderId: 'f1' }), makeLink({ folderId: null })],
      errors: [],
    });
    expect(result.folderIds).toEqual(['f1', null]);
  });
});
