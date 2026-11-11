import { TRASH_ITEM_KIND, type TrashItem } from '@shelfmark/contracts';
import { toRef, trashKey } from './trash-key';

const ITEM: TrashItem = {
  kind: TRASH_ITEM_KIND.Folder,
  id: 'f1',
  title: 'Old courses',
  url: null,
  faviconUrl: null,
  imageUrl: null,
  fromFolderName: null,
  linkCount: 9,
  deletedAt: '2026-11-01T10:00:00.000Z',
  expiresAt: '2026-12-01T10:00:00.000Z',
};

describe('trash key', () => {
  it('includes the kind, so a link and a folder never collide', () => {
    expect(trashKey({ kind: TRASH_ITEM_KIND.Link, id: 'x' })).not.toBe(
      trashKey({ kind: TRASH_ITEM_KIND.Folder, id: 'x' }),
    );
  });

  it('builds the request ref of an entry', () => {
    expect(toRef(ITEM)).toEqual({ kind: TRASH_ITEM_KIND.Folder, id: 'f1' });
  });
});
