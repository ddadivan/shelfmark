import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PIN_KIND, type FolderResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS } from '@shelfmark/contracts/testing';
import { FolderActionsService } from '../../folders/services/folder-actions.service';
import { PinActionsService } from '../../pins/services/pin-actions.service';
import { PinsStore } from '../../../stores/pins.store';
import { LibraryFilterService } from './library-filter.service';
import { LibraryFolderService } from './library-folder.service';

const FOLDER: FolderResponse = { ...MOCK_FOLDERS[0], id: 'f1', name: 'Learning' };

function setup(isFolder = true, pinned = false) {
  const folderSignal = signal<FolderResponse | undefined>(FOLDER);
  const actions = {
    create: vi.fn(() => Promise.resolve()),
    addLinkHere: vi.fn(() => Promise.resolve()),
    rename: vi.fn(() => Promise.resolve()),
    style: vi.fn(() => Promise.resolve()),
    move: vi.fn(() => Promise.resolve()),
    share: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
  };
  const pinActions = {
    pinFolder: vi.fn(() => Promise.resolve()),
    unpinFolder: vi.fn(() => Promise.resolve()),
  };
  const has = vi.fn(
    (kind: string, id: string) => pinned && kind === PIN_KIND.Folder && id === 'f1',
  );
  TestBed.configureTestingModule({
    providers: [
      LibraryFolderService,
      {
        provide: LibraryFilterService,
        useValue: { isFolder: computed(() => isFolder), folder: folderSignal },
      },
      { provide: FolderActionsService, useValue: actions },
      { provide: PinActionsService, useValue: pinActions },
      { provide: PinsStore, useValue: { has } },
    ],
  });
  return { service: TestBed.inject(LibraryFolderService), actions, pinActions };
}

describe('LibraryFolderService', () => {
  it('runs each menu item on the folder of the page', () => {
    const { service, actions } = setup();

    service.createSubfolder();
    service.addLinkHere();
    service.rename();
    service.settings();
    service.move();
    service.share();
    service.remove();

    expect(actions.create).toHaveBeenCalledWith(FOLDER);
    expect(actions.addLinkHere).toHaveBeenCalledWith(FOLDER);
    expect(actions.rename).toHaveBeenCalledWith(FOLDER);
    expect(actions.style).toHaveBeenCalledWith(FOLDER);
    expect(actions.move).toHaveBeenCalledWith(FOLDER);
    expect(actions.share).toHaveBeenCalledWith(FOLDER);
    expect(actions.delete).toHaveBeenCalledWith(FOLDER);
  });

  it('pins an unpinned folder and unpins a pinned one', () => {
    const first = setup(true, false);
    first.service.togglePin();
    expect(first.service.pinned()).toBe(false);
    expect(first.pinActions.pinFolder).toHaveBeenCalledWith(FOLDER);

    TestBed.resetTestingModule();
    const second = setup(true, true);
    second.service.togglePin();
    expect(second.service.pinned()).toBe(true);
    expect(second.pinActions.unpinFolder).toHaveBeenCalledWith(FOLDER);
  });

  it('has no folder and does nothing outside a folder page', () => {
    const { service, actions } = setup(false);

    service.rename();

    expect(service.folder()).toBeNull();
    expect(actions.rename).not.toHaveBeenCalled();
  });
});
