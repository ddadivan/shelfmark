import type { UiTreeReorderEvent } from '@shelfmark/ui';
import { TestBed } from '@angular/core/testing';
import { FolderActionsService } from '../../../features/folders/services/folder-actions.service';
import { PinActionsService } from '../../../features/pins/services/pin-actions.service';
import { ReorderAnnouncer } from '../../../core/a11y/reorder-announcer.service';
import { FoldersStore } from '../../../stores/folders.store';
import { PinsStore } from '../../../stores/pins.store';
import { SidebarFoldersService } from './sidebar-folders.service';

const FOLDER = { id: 'f1', name: 'Folder one' };

function setup(pinned = false) {
  const actions = {
    create: vi.fn().mockResolvedValue(undefined),
    style: vi.fn().mockResolvedValue(undefined),
    addLinkHere: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
    move: vi.fn().mockResolvedValue(undefined),
    share: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    reorder: vi.fn().mockResolvedValue(undefined),
  };
  const pinActions = {
    pinFolder: vi.fn().mockResolvedValue(undefined),
    unpinFolder: vi.fn().mockResolvedValue(undefined),
  };
  const announcer = { announce: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      SidebarFoldersService,
      { provide: FolderActionsService, useValue: actions },
      { provide: PinActionsService, useValue: pinActions },
      { provide: ReorderAnnouncer, useValue: announcer },
      { provide: FoldersStore, useValue: { entityMap: () => ({ [FOLDER.id]: FOLDER }) } },
      { provide: PinsStore, useValue: { has: () => pinned } },
    ],
  });
  return { service: TestBed.inject(SidebarFoldersService), actions, pinActions, announcer };
}

describe('SidebarFoldersService', () => {
  it('does nothing from the menu before it was opened', () => {
    const { service, actions } = setup();
    service.rename();
    expect(actions.rename).not.toHaveBeenCalled();
  });

  it('tracks the open menu and keeps the folder after it closed', () => {
    const { service, actions } = setup(true);
    service.openMenuFor(FOLDER.id);
    expect(service.menuNodeId()).toBe(FOLDER.id);
    expect(service.menuPinned()).toBe(true);
    service.menuClosed();
    expect(service.menuNodeId()).toBeNull();
    expect(service.menuPinned()).toBe(false);
    service.rename();
    expect(actions.rename).toHaveBeenCalledWith(FOLDER);
  });

  it('runs each menu item on the folder of the menu', () => {
    const { service, actions } = setup();
    service.openMenuFor(FOLDER.id);
    service.style();
    service.createSubfolder();
    service.addLinkHere();
    service.move();
    service.share();
    service.remove();
    expect(actions.style).toHaveBeenCalledWith(FOLDER);
    expect(actions.create).toHaveBeenCalledWith(FOLDER);
    expect(actions.addLinkHere).toHaveBeenCalledWith(FOLDER);
    expect(actions.move).toHaveBeenCalledWith(FOLDER);
    expect(actions.share).toHaveBeenCalledWith(FOLDER);
    expect(actions.delete).toHaveBeenCalledWith(FOLDER);
  });

  it('creates a top level folder without a parent', () => {
    const { service, actions } = setup();
    service.createTopLevel();
    expect(actions.create).toHaveBeenCalledWith();
  });

  it('pins an unpinned folder and unpins a pinned one', () => {
    const unpinned = setup(false);
    unpinned.service.openMenuFor(FOLDER.id);
    unpinned.service.togglePin();
    expect(unpinned.pinActions.pinFolder).toHaveBeenCalledWith(FOLDER);
    TestBed.resetTestingModule();
    const pinned = setup(true);
    pinned.service.openMenuFor(FOLDER.id);
    pinned.service.togglePin();
    expect(pinned.pinActions.unpinFolder).toHaveBeenCalledWith(FOLDER);
  });

  it('says and saves a reorder', () => {
    const { service, actions, announcer } = setup();
    service.reorder({
      node: { id: 'f1', name: 'x' },
      fromIndex: 0,
      toIndex: 2,
      total: 3,
    } as unknown as UiTreeReorderEvent);
    expect(announcer.announce).toHaveBeenCalledWith(0, 2, 3);
    expect(actions.reorder).toHaveBeenCalledWith('f1', 2);
  });
});
