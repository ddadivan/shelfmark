import {
  CLEANUP_SOURCE,
  CLEANUP_STATE,
  DUPLICATE_REASON,
  KEEP_REASON,
  type CleanupReport,
  type LinkResponse,
} from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { of } from 'rxjs';
import type { CleanupApi } from '../app/features/cleanup/models/cleanup-api.interface';

/** Every method of `CleanupApi` as a Vitest mock (spec helper). */
export type FakeCleanupApi = { [K in keyof CleanupApi]: ReturnType<typeof vi.fn<CleanupApi[K]>> };

/** The Angular fixture link (in the folder Angular). */
const ANGULAR = MOCK_LINKS[0] as LinkResponse;

function link(id: string, patch: Partial<LinkResponse> = {}): LinkResponse {
  return { ...ANGULAR, id, ...patch };
}

/**
 * A ready report (spec helper): "Hacker News" saved three times (`g1`, kept in Unsorted for its
 * tags, two copies), the Angular link and a same-page copy on a subdomain (`g2`, AI), and the pair
 * `javascript` ← `js` (`p1`, AI, 2 links get the kept tag).
 */
export function cleanupReport(patch: Partial<CleanupReport> = {}): CleanupReport {
  const news = { url: 'https://news.ycombinator.com/', title: 'Hacker News', folderId: null };
  return {
    state: CLEANUP_STATE.Ready,
    checked: 40,
    total: 40,
    checkedAt: new Date(Date.now() - 120_000).toISOString(),
    aiIncluded: true,
    aiAvailable: true,
    duplicates: [
      {
        id: 'g1',
        reason: DUPLICATE_REASON.SameAddress,
        source: CLEANUP_SOURCE.Rule,
        keep: link('hn1', { ...news, tags: ['reading'] }),
        keepReason: KEEP_REASON.MoreTags,
        copies: [link('hn2', { ...news, tags: [] }), link('hn3', { ...news, tags: [] })],
      },
      {
        id: 'g2',
        reason: DUPLICATE_REASON.SamePage,
        source: CLEANUP_SOURCE.Ai,
        keep: ANGULAR,
        keepReason: KEEP_REASON.InFolder,
        copies: [link('ng2', { url: 'https://next.angular.dev/overview', folderId: null })],
      },
    ],
    similarTags: [
      {
        id: 'p1',
        source: CLEANUP_SOURCE.Ai,
        keep: { id: 't-js-long', name: 'javascript', links: 5 },
        merge: { id: 't-js', name: 'js', links: 2 },
      },
    ],
    ...patch,
  };
}

/** A fake `CLEANUP_API` answering `report` to reads and runs (spec helper). */
export function fakeCleanupApi(report: CleanupReport = cleanupReport()): FakeCleanupApi {
  return {
    getReport: vi.fn<CleanupApi['getReport']>(() => of(report)),
    run: vi.fn<CleanupApi['run']>(() => of(report)),
    apply: vi.fn<CleanupApi['apply']>(),
    undo: vi.fn<CleanupApi['undo']>(),
    getSummary: vi.fn<CleanupApi['getSummary']>(),
    dismissCard: vi.fn<CleanupApi['dismissCard']>(() => of(undefined)),
  };
}
