import { FOLDER_DELETE_MODE, statsWeekStarts, type MeStatsResponse } from '@shelfmark/contracts';
import type { ContractScenario } from '../models/contract-scenario.interface';
import { ANY } from '../support/any.const';
import { expectEqual } from '../support/expect-equal';
import { scenario } from '../support/scenario';

/**
 * The stats without the connected accounts: the API reads them from the Better Auth records of
 * the test sign-in, the mock has no provider, so they are left to each side's own tests.
 */
function withoutAccounts(stats: MeStatsResponse): Omit<MeStatsResponse, 'connectedAccounts'> {
  return {
    linkCount: stats.linkCount,
    folderCount: stats.folderCount,
    tagCount: stats.tagCount,
    topSites: stats.topSites,
    topTags: stats.topTags,
    weeklyLinks: stats.weeklyLinks,
    memberSince: stats.memberSince,
    oldestLinkAt: stats.oldestLinkAt,
  };
}

/** The 12 weeks with every count 0 but the current week's. */
function weeks(current: number): MeStatsResponse['weeklyLinks'] {
  const starts = statsWeekStarts(new Date());
  return starts.map((weekStart, index) => ({
    weekStart,
    count: index === starts.length - 1 ? current : 0,
  }));
}

export const ME_SCENARIOS: readonly ContractScenario[] = [
  scenario('me', 'a new account has empty stats', async ({ me }) => {
    expectEqual(withoutAccounts(await me.stats()), {
      linkCount: 0,
      folderCount: 0,
      tagCount: 0,
      topSites: [],
      topTags: [],
      weeklyLinks: weeks(0),
      memberSince: ANY.time,
      oldestLinkAt: null,
    });
  }),

  scenario(
    'me',
    'counts live links, folders and tags, top sites and tags; Trash is left out',
    async ({ me, links, folders }) => {
      const reading = await folders.create({ name: 'Reading' });
      const gone = await folders.create({ name: 'Gone' });
      await folders.remove(gone.id, FOLDER_DELETE_MODE.MoveToUnsorted);
      const first = await links.create({
        url: 'https://www.github.com/a',
        title: 'A',
        tags: ['dev'],
      });
      await links.create({
        url: 'https://github.com/b',
        title: 'B',
        tags: ['dev', 'angular'],
        folderId: reading.id,
      });
      await links.create({ url: 'https://docs.example.org/c', title: 'C' });
      const trashed = await links.create({ url: 'https://trashed.example/d', title: 'D' });
      await links.remove(trashed.id);

      expectEqual(withoutAccounts(await me.stats()), {
        linkCount: 3,
        folderCount: 1,
        tagCount: 2,
        topSites: [
          { host: 'github.com', count: 2, faviconUrl: null },
          { host: 'docs.example.org', count: 1, faviconUrl: null },
        ],
        topTags: [
          { name: 'dev', count: 2 },
          { name: 'angular', count: 1 },
        ],
        weeklyLinks: weeks(3),
        memberSince: ANY.time,
        oldestLinkAt: first.createdAt,
      });
    },
  ),
];
