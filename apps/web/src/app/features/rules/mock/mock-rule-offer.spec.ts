import { RULE_LIMIT, type LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { mockRuleOffer } from './mock-rule-offer';
import type { MockRule } from './models/mock-rule.interface';
import type { MockRuleOfferSource } from './models/mock-rule-offer-source.interface';

const BASE = MOCK_LINKS[1] as LinkResponse;

function link(id: string, url: string, folderId: string | null, day: number): LinkResponse {
  const at = `2026-11-${String(day).padStart(2, '0')}T00:00:00.000Z`;
  return { ...BASE, id, url, folderId, createdAt: at, updatedAt: at };
}

const LINKS = [
  link('a', 'https://www.youtube.com/watch?v=1', 'videos', 10),
  link('b', 'https://youtube.com/watch?v=2', 'videos', 9),
  link('c', 'https://youtube.com/watch?v=3', 'videos', 8),
  link('d', 'https://www.youtube.com/watch?v=4', 'music', 7),
  link('e', 'https://github.com/a', 'code', 6),
  link('f', 'https://github.com/b', 'other', 5),
];

function source(patch: Partial<MockRuleOfferSource> = {}): MockRuleOfferSource {
  return {
    links: LINKS,
    rules: [],
    dismissed: [],
    liveFolder: () => true,
    autoAppliedFolder: () => null,
    ...patch,
  };
}

function rule(domain: string): MockRule {
  return { id: domain, domain, folderId: 'x', tags: [], createdAt: '2026-11-01T00:00:00.000Z' };
}

describe('mockRuleOffer', () => {
  it('offers the folder the newest three links of the site share (www. counts as the site)', () => {
    expect(mockRuleOffer(['a'], source())).toEqual({
      domain: 'youtube.com',
      folderId: 'videos',
      count: 3,
    });
  });

  it('offers nothing for mixed folders, an unfiled link or a missing one', () => {
    expect(mockRuleOffer(['e'], source())).toBeNull();
    expect(mockRuleOffer(['nope'], source())).toBeNull();
    const unsorted = LINKS.map((item) => (item.id === 'a' ? { ...item, folderId: null } : item));
    expect(mockRuleOffer(['a'], source({ links: unsorted }))).toBeNull();
  });

  it('offers nothing after "Not now", for a matching rule, at the rule limit or with an AI mark', () => {
    expect(mockRuleOffer(['a'], source({ dismissed: ['youtube.com'] }))).toBeNull();
    expect(mockRuleOffer(['a'], source({ rules: [rule('youtube.com')] }))).toBeNull();
    const full = Array.from({ length: RULE_LIMIT.PerUserMax }, (_, i) => rule(`s${i}.example`));
    expect(mockRuleOffer(['a'], source({ rules: full }))).toBeNull();
    expect(
      mockRuleOffer(['a'], source({ autoAppliedFolder: (id) => (id === 'b' ? 'videos' : null) })),
    ).toBeNull();
    expect(mockRuleOffer(['a'], source({ liveFolder: () => false }))).toBeNull();
  });

  it('checks the next site when the first does not qualify', () => {
    expect(mockRuleOffer(['e', 'a'], source())?.domain).toBe('youtube.com');
  });
});
