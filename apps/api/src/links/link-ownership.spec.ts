import { NotFoundException } from '@nestjs/common';
import { LINK_ERROR_MESSAGE } from '@shelfmark/contracts';
import { describe, expect, it, vi } from 'vitest';
import { requireLiveLink, requireOwnedOr404, type LinkLookupClient } from './link-ownership';

function clientAnswering(row: unknown) {
  const findFirst = vi.fn().mockResolvedValue(row);
  return { db: { link: { findFirst } } as unknown as LinkLookupClient, findFirst };
}

describe('requireOwnedOr404', () => {
  it('answers the row', () => {
    expect(requireOwnedOr404({ id: 'a' }, 'nope')).toEqual({ id: 'a' });
  });

  it.each([null, undefined])('throws a 404 with the message for %s', (row) => {
    expect(() => requireOwnedOr404(row, 'nope')).toThrow(new NotFoundException('nope'));
  });
});

describe('requireLiveLink', () => {
  it('looks up the session user live link and passes select/include through', async () => {
    const { db, findFirst } = clientAnswering({ id: 'l1' });
    await expect(requireLiveLink(db, 'u1', 'l1', { select: { id: true } })).resolves.toEqual({
      id: 'l1',
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'l1', userId: 'u1', deletedAt: null },
      select: { id: true },
    });
  });

  it('reads trashed links only when asked to', async () => {
    const { db, findFirst } = clientAnswering({ id: 'l1' });
    await requireLiveLink(db, 'u1', 'l1', { select: { id: true } }, { includeTrashed: true });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'l1', userId: 'u1' },
      select: { id: true },
    });
  });

  it('is the link 404 for a missing, foreign or trashed link', async () => {
    const { db } = clientAnswering(null);
    await expect(requireLiveLink(db, 'u1', 'l1', {})).rejects.toThrow(
      new NotFoundException(LINK_ERROR_MESSAGE.NotFound),
    );
  });
});
