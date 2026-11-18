import { KEEP_REASON } from '@shelfmark/contracts';
import type { KeepCandidate } from './models/keep-candidate.interface';
import { pickKeep } from './pick-keep';

const base = (id: string, extra: Partial<KeepCandidate> = {}): KeepCandidate => ({
  id,
  inFolder: false,
  hasNote: false,
  hasReminder: false,
  tagCount: 0,
  isFavorite: false,
  lastOpenedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  ...extra,
});

describe('pickKeep', () => {
  it('answers null for no candidates and the only one for one', () => {
    expect(pickKeep([])).toBeNull();
    expect(pickKeep([base('a')])).toEqual({ keepId: 'a', reason: KEEP_REASON.Oldest });
  });

  it.each([
    ['in a folder', { inFolder: true }, KEEP_REASON.InFolder],
    ['a note', { hasNote: true }, KEEP_REASON.HasNote],
    ['a future reminder', { hasReminder: true }, KEEP_REASON.HasReminder],
    ['more tags', { tagCount: 2 }, KEEP_REASON.MoreTags],
    ['favourite', { isFavorite: true }, KEEP_REASON.Favorite],
    ['recently opened', { lastOpenedAt: new Date('2026-05-01') }, KEEP_REASON.RecentlyOpened],
    ['oldest', { createdAt: new Date('2025-01-01') }, KEEP_REASON.Oldest],
  ] as const)('keeps the one with %s', (_label, extra, reason) => {
    expect(pickKeep([base('a'), base('z', extra), base('m')])).toEqual({ keepId: 'z', reason });
  });

  it('applies the criteria in rule order and names the first that decided', () => {
    const choice = pickKeep([
      base('a', { hasNote: true, tagCount: 5, isFavorite: true }),
      base('b', { inFolder: true }),
      base('c', { inFolder: true, hasNote: true }),
    ]);
    expect(choice).toEqual({ keepId: 'c', reason: KEEP_REASON.InFolder });
  });

  it('prefers any opened link over a never-opened one, then the smaller id on a full tie', () => {
    expect(pickKeep([base('b', { lastOpenedAt: new Date('2020-01-01') }), base('a')])?.keepId).toBe(
      'b',
    );
    expect(pickKeep([base('b'), base('a')])).toEqual({ keepId: 'a', reason: KEEP_REASON.Oldest });
  });
});
