import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { applyLinkChange } from './apply-link-change';
import type { LinkSlot } from './models/link-slot.interface';

const link = (id: string, title = id): LinkResponse => ({
  ...(MOCK_LINKS[0] as LinkResponse),
  id,
  title,
});
const ids = (list: readonly LinkResponse[]) => list.map((item) => item.id);

describe('applyLinkChange', () => {
  const list = [link('a'), link('b'), link('c')];

  it('replaces a held link and leaves the others', () => {
    const next = applyLinkChange(list, { upserted: [link('b', 'New')] });
    expect(next.map((item) => item.title)).toEqual(['a', 'New', 'c']);
  });

  it('does not add a link the list never held', () => {
    expect(applyLinkChange(list, { upserted: [link('z')], moved: true })).toBe(list);
  });

  it('returns the same array when nothing applies', () => {
    expect(applyLinkChange(list, { reload: true })).toBe(list);
    expect(applyLinkChange(list, { removed: ['z'] })).toBe(list);
  });

  it('removes gone links and puts a restored one back at its slot', () => {
    const slots = new Map<string, LinkSlot>();
    const without = applyLinkChange(list, { removed: ['b'] }, slots);
    expect(ids(without)).toEqual(['a', 'c']);
    const back = applyLinkChange(without, { upserted: [link('b', 'Back')], moved: true }, slots);
    expect(ids(back)).toEqual(['a', 'b', 'c']);
    expect(back[1]?.title).toBe('Back');
    expect(slots.size).toBe(0);
  });

  it('keeps a removed link out without a slot map', () => {
    const without = applyLinkChange(list, { removed: ['b'] });
    expect(applyLinkChange(without, { upserted: [link('b')] })).toBe(without);
  });

  it('clamps the slot to a shorter list', () => {
    const slots = new Map<string, LinkSlot>();
    const gone = applyLinkChange(list, { removed: ['c'] }, slots);
    const shorter = applyLinkChange(gone, { removed: ['a', 'b'] }, slots);
    expect(ids(applyLinkChange(shorter, { upserted: [link('c')] }, slots))).toEqual(['c']);
  });
});
