import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import type { FolderResponse, LinkResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { FoldersStore } from '../../../stores/folders.store';
import { LinkSelectionStore } from '../../../stores/link-selection.store';
import { BulkLinkActionsService } from '../bulk/bulk-link-actions.service';
import { LinkActionsService } from '../link-actions.service';
import { LINKS_SCOPE } from '../models/links-scope.const';
import { LINK_DROP_ATTRIBUTE } from '../models/link-drop-attribute.const';
import { LinkDragService } from './link-drag.service';

const FOLDER_A = MOCK_FOLDERS[0] as FolderResponse;
const FOLDER_B = MOCK_FOLDERS[1] as FolderResponse;

function link(folderId: string | null): LinkResponse {
  return { ...MOCK_LINKS[0], folderId };
}

function setup() {
  const moveTo = vi.fn(() => Promise.resolve());
  const bulkMoveTo = vi.fn(() => Promise.resolve(true));
  TestBed.configureTestingModule({
    providers: [
      { provide: LinkActionsService, useValue: { moveTo } },
      { provide: BulkLinkActionsService, useValue: { moveTo: bulkMoveTo } },
      {
        provide: FoldersStore,
        useValue: { entityMap: () => ({ [FOLDER_A.id]: FOLDER_A, [FOLDER_B.id]: FOLDER_B }) },
      },
    ],
  });
  const doc = TestBed.inject(DOCUMENT);
  const element = (attributes: Record<string, string>): HTMLElement => {
    const outer = doc.createElement('div');
    for (const [name, value] of Object.entries(attributes)) {
      outer.setAttribute(name, value);
    }
    const inner = doc.createElement('span');
    outer.appendChild(inner);
    doc.body.appendChild(outer);
    return inner;
  };
  const under = vi.fn<(x: number, y: number) => Element | null>(() => null);
  doc.elementFromPoint = under;
  return { drag: TestBed.inject(LinkDragService), moveTo, bulkMoveTo, element, under, doc };
}

describe('LinkDragService', () => {
  it('targets a sidebar folder row and moves the link there on drop', () => {
    const { drag, moveTo, element, under } = setup();
    under.mockReturnValue(element({ 'data-ui-tree-id': FOLDER_B.id }));

    drag.start(link(FOLDER_A.id));
    expect(drag.dragging()).toBe(true);
    drag.move(10, 10);
    expect(drag.treeTargetId()).toBe(FOLDER_B.id);
    expect(drag.folderTargetId()).toBe(FOLDER_B.id);
    drag.drop();

    expect(moveTo).toHaveBeenCalledWith(link(FOLDER_A.id), FOLDER_B.id);
    expect(drag.dragging()).toBe(false);
    expect(drag.treeTargetId()).toBeNull();
  });

  it('targets Unsorted in the tree as the null folder', () => {
    const { drag, moveTo, element, under } = setup();
    under.mockReturnValue(element({ 'data-ui-tree-id': LINKS_SCOPE.Unsorted }));

    drag.start(link(FOLDER_A.id));
    drag.move(1, 1);
    expect(drag.treeTargetId()).toBe(LINKS_SCOPE.Unsorted);
    expect(drag.folderTargetId()).toBeNull();
    drag.drop();

    expect(moveTo).toHaveBeenCalledWith(link(FOLDER_A.id), null);
  });

  it('targets a subfolder tile in the feed', () => {
    const { drag, moveTo, element, under } = setup();
    under.mockReturnValue(element({ [LINK_DROP_ATTRIBUTE]: FOLDER_A.id }));

    drag.start(link(null));
    drag.move(1, 1);
    drag.drop();

    expect(moveTo).toHaveBeenCalledWith(link(null), FOLDER_A.id);
  });

  it('ignores the folder the link is already in, fixed rows and unknown ids', () => {
    const { drag, moveTo, element, under } = setup();
    drag.start(link(FOLDER_A.id));

    const cases: Record<string, string>[] = [
      { 'data-ui-tree-id': FOLDER_A.id },
      { 'data-ui-tree-id': LINKS_SCOPE.All },
      { 'data-ui-tree-id': 'gone' },
      {},
    ];
    for (const attributes of cases) {
      under.mockReturnValue(element(attributes));
      drag.move(1, 1);
      expect(drag.treeTargetId()).toBeNull();
    }
    drag.drop();

    expect(moveTo).not.toHaveBeenCalled();
  });

  it('Esc cancels: the highlight goes and the release moves nothing', () => {
    const { drag, moveTo, element, under, doc } = setup();
    under.mockReturnValue(element({ 'data-ui-tree-id': FOLDER_B.id }));
    drag.start(link(FOLDER_A.id));
    drag.move(1, 1);

    doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(drag.treeTargetId()).toBeNull();
    drag.move(2, 2);
    expect(drag.treeTargetId()).toBeNull();
    drag.drop();

    expect(moveTo).not.toHaveBeenCalled();
  });

  it('stops listening for Esc after the drop', () => {
    const { drag, doc } = setup();
    drag.start(link(null));
    drag.drop();
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });

    doc.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('remembers where the item was grabbed and its height until the drag ends', () => {
    const { drag, doc } = setup();
    const item = doc.createElement('li');
    item.getBoundingClientRect = () => new DOMRect(10, 20, 300, 180);
    const event = new PointerEvent('pointerdown', { clientX: 40, clientY: 70 });
    Object.defineProperty(event, 'currentTarget', { value: item });
    const root = doc.documentElement.style;

    drag.grab(event);
    drag.start(link(null));

    expect(root.getPropertyValue('--drag-grab-x')).toBe('30px');
    expect(root.getPropertyValue('--drag-grab-y')).toBe('50px');
    expect(root.getPropertyValue('--drag-slot-height')).toBe('180px');
    drag.drop();
    expect(root.getPropertyValue('--drag-slot-height')).toBe('');
    expect(root.getPropertyValue('--drag-grab-x')).toBe('');
  });

  describe('with a selection', () => {
    const picked = (): LinkResponse[] => [
      { ...MOCK_LINKS[0], id: 'a', folderId: FOLDER_A.id },
      { ...MOCK_LINKS[0], id: 'b', folderId: null },
      { ...MOCK_LINKS[0], id: 'c', folderId: FOLDER_A.id },
    ];

    it('dragging a picked link moves all picked links with one batch and clears the selection', async () => {
      const { drag, moveTo, bulkMoveTo, element, under } = setup();
      const selection = TestBed.inject(LinkSelectionStore);
      selection.selectAll(['a', 'b', 'c']);
      const links = picked();
      under.mockReturnValue(element({ 'data-ui-tree-id': FOLDER_B.id }));

      drag.start(links[1] as LinkResponse, links);
      expect([...drag.carriedIds()]).toEqual(['a', 'b', 'c']);
      drag.move(1, 1);
      drag.drop();
      await Promise.resolve();
      await Promise.resolve();

      expect(bulkMoveTo).toHaveBeenCalledWith(links, FOLDER_B.id);
      expect(moveTo).not.toHaveBeenCalled();
      expect(selection.count()).toBe(0);
    });

    it('dragging an unselected link moves just that link', () => {
      const { drag, moveTo, bulkMoveTo, element, under } = setup();
      const links = picked();
      const other = { ...MOCK_LINKS[0], id: 'z', folderId: null } as LinkResponse;
      under.mockReturnValue(element({ 'data-ui-tree-id': FOLDER_B.id }));

      drag.start(other, links);
      drag.move(1, 1);
      drag.drop();

      expect(moveTo).toHaveBeenCalledWith(other, FOLDER_B.id);
      expect(bulkMoveTo).not.toHaveBeenCalled();
    });

    it('is no target when every carried link is already in the folder', () => {
      const { drag, element, under } = setup();
      const links = picked().map((item) => ({ ...item, folderId: FOLDER_A.id }));
      under.mockReturnValue(element({ 'data-ui-tree-id': FOLDER_A.id }));

      drag.start(links[0] as LinkResponse, links);
      drag.move(1, 1);

      expect(drag.treeTargetId()).toBeNull();
    });
  });
});
