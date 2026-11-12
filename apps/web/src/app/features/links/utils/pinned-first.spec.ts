import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { pinnedFirst } from './pinned-first';

function link(id: string, pinnedInFolderAt: string | null): LinkResponse {
  return { ...MOCK_LINKS[0], id, pinnedInFolderAt };
}

const LINKS = [
  link('x', null),
  link('p2', '2026-02-01'),
  link('y', null),
  link('p1', '2026-01-01'),
];

describe('pinnedFirst', () => {
  it('puts pinned links first in the order they were pinned, the rest keeps its order', () => {
    expect(pinnedFirst(LINKS, true).map((item) => item.id)).toEqual(['p1', 'p2', 'x', 'y']);
  });

  it('leaves the list alone outside a folder', () => {
    expect(pinnedFirst(LINKS, false).map((item) => item.id)).toEqual(['x', 'p2', 'y', 'p1']);
  });
});
