import { AUTH_PROVIDER, type LinkResponse } from '@shelfmark/contracts';
import { buildMockStats } from './build-mock-stats';

function link(
  url: string,
  createdAt: string,
  tags: string[] = [],
  faviconUrl: string | null = null,
) {
  return { url, createdAt, tags, faviconUrl } as LinkResponse;
}

describe('buildMockStats', () => {
  it('counts like the API: hosts without www, code-point ties, newest favicon, UTC weeks', () => {
    const stats = buildMockStats({
      links: [
        link('https://www.GitHub.com/a', '2026-11-10T10:00:00.000Z', ['dev'], '/f/old'),
        link('https://github.com/b', '2026-11-12T10:00:00.000Z', ['dev', 'angular'], '/f/new'),
        link('https://beta.test/', '2026-11-08T23:00:00.000Z'),
        link('https://alpha.test/', '2026-06-01T00:00:00.000Z'),
      ],
      folderCount: 2,
      now: new Date('2026-11-13T12:00:00Z'),
      memberSince: '2025-01-01T00:00:00.000Z',
      connectedAccounts: [
        { provider: AUTH_PROVIDER.Google, connectedAt: '2025-01-01T00:00:00.000Z' },
      ],
    });

    expect(stats.linkCount).toBe(4);
    expect(stats.tagCount).toBe(2);
    expect(stats.topSites).toEqual([
      { host: 'github.com', count: 2, faviconUrl: '/f/new' },
      { host: 'alpha.test', count: 1, faviconUrl: null },
      { host: 'beta.test', count: 1, faviconUrl: null },
    ]);
    expect(stats.topTags).toEqual([
      { name: 'dev', count: 2 },
      { name: 'angular', count: 1 },
    ]);
    expect(stats.weeklyLinks.at(-1)).toEqual({ weekStart: '2026-11-09', count: 2 });
    expect(stats.weeklyLinks.at(-2)).toEqual({ weekStart: '2026-11-02', count: 1 });
    expect(stats.oldestLinkAt).toBe('2026-06-01T00:00:00.000Z');
    expect(stats.connectedAccounts).toHaveLength(1);
  });

  it('starts the weeks on the requested first day', () => {
    const stats = buildMockStats({
      links: [
        link('https://a.test/', '2026-11-08T00:00:00.000Z'),
        link('https://b.test/', '2026-11-07T23:59:59.000Z'),
      ],
      folderCount: 0,
      now: new Date('2026-11-13T12:00:00Z'),
      firstDay: 7,
      memberSince: '2025-01-01T00:00:00.000Z',
      connectedAccounts: [],
    });

    expect(stats.weeklyLinks.at(-1)).toEqual({ weekStart: '2026-11-08', count: 1 });
    expect(stats.weeklyLinks.at(-2)).toEqual({ weekStart: '2026-11-01', count: 1 });
  });

  it('a new account: zeros and no oldest link', () => {
    const stats = buildMockStats({
      links: [],
      folderCount: 0,
      now: new Date('2026-11-13T12:00:00Z'),
      memberSince: '2025-01-01T00:00:00.000Z',
      connectedAccounts: [],
    });

    expect(stats.oldestLinkAt).toBeNull();
    expect(stats.weeklyLinks.every((week) => week.count === 0)).toBe(true);
  });
});
