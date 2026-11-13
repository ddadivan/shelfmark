import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideRouter, Router } from '@angular/router';
import { FOLDER_DELETE_MODE } from '@shelfmark/contracts';
import { MOCK_ID, MOCK_LINKS, MOCK_NAME } from '@shelfmark/contracts/testing';
import { DialogService, ToastService, type SelectOption } from '@shelfmark/ui';
import { UiSelectHarness } from '@shelfmark/ui/testing';
import { axeViolations } from '../../../../testing/axe';
import { AddLinkDialogService } from '../../links/services/add-link-dialog.service';
import { ADD_LINK_ACTION } from '../../links/models/add-link-action.const';
import { FoldersStore } from '../../../stores/folders.store';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { FOLDERS_API } from '../../links/models/folders-api.const';
import { LINKS_API } from '../../links/models/links-api.const';
import { MOCK_FOLDER_NAME } from '../../links/models/mock-folder-name.const';
import { TAGS_API } from '../../links/models/tags-api.const';
import { MockFoldersApi } from '../../links/mock/mock-folders.api';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MockLinksApi } from '../../links/mock/mock-links.api';
import { MockTagsApi } from '../../links/mock/mock-tags.api';
import { FolderActionsService } from './folder-actions.service';
import type { MoveFolderDialogData } from '../models/move-folder-dialog-data.interface';
import type { TreeComponent } from '@shelfmark/ui';
import { SidebarTreeFocusService } from '../../../shell/sidebar/services/sidebar-tree-focus.service';
import { MoveFolderDialogComponent } from '../components/move-folder-dialog/move-folder-dialog.component';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class RootComponent {}

/** Harness loader for the overlays under <body> (the dialog, the select list). */
function overlayLoader() {
  return TestbedHarnessEnvironment.documentRootLoader(TestBed.createComponent(RootComponent));
}

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([
        { path: 'folders/:folderId', children: [] },
        { path: 'links', children: [] },
      ]),
      { provide: FOLDERS_API, useClass: MockFoldersApi },
      { provide: LINKS_API, useClass: MockLinksApi },
      { provide: TAGS_API, useClass: MockTagsApi },
    ],
  });
  await loadEnglish();
  const store = TestBed.inject(FoldersStore);
  await store.load();
  return {
    store,
    router: TestBed.inject(Router),
    data: TestBed.inject(MockLibraryData),
    actions: TestBed.inject(FolderActionsService),
  };
}

function root(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.cdk-dialog-container');
}

function dialog(): HTMLElement {
  const element = root();
  if (!element) {
    throw new Error('no dialog open');
  }
  return element;
}

async function until(check: () => void): Promise<void> {
  await vi.waitFor(
    () => {
      TestBed.tick();
      check();
    },
    { timeout: 3000 },
  );
}

async function opened(): Promise<HTMLElement> {
  await until(() => {
    expect(root()).not.toBeNull();
  });
  return dialog();
}

function button(label: string): HTMLButtonElement {
  const found = [...dialog().querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!found) {
    throw new Error(`no button ${label}`);
  }
  return found;
}

function nameField(): HTMLInputElement {
  const field = dialog().querySelector<HTMLInputElement>('input[type="text"], input:not([type])');
  if (!field) {
    throw new Error('no name field');
  }
  return field;
}

function type(value: string): void {
  const field = nameField();
  field.value = value;
  field.dispatchEvent(new Event('input'));
  field.dispatchEvent(new Event('blur'));
  TestBed.tick();
}

async function closed(): Promise<void> {
  await until(() => {
    expect(root()).toBeNull();
  });
}

afterEach(() => {
  document.querySelectorAll('.cdk-overlay-container > *').forEach((node) => {
    node.remove();
  });
});

describe('FolderActionsService', () => {
  describe('create', () => {
    it('waits for the server, adds the folder and opens it', async () => {
      const { actions, store, router } = await setup();

      const done = actions.create();
      await opened();
      expect(dialog().textContent).toContain('New folder');
      await until(() => {
        expect(document.activeElement).toBe(nameField());
      });
      type('Projects');
      button('Create folder').click();
      await closed();
      await done;

      const created = store.entities().find((folder) => folder.name === 'Projects');
      expect(created?.parentId).toBeNull();
      expect(router.url).toBe(`/folders/${created?.id}`);
    });

    it('asks the sidebar tree to focus the new folder, but not after Cancel', async () => {
      const { actions, store } = await setup();
      const focusCreated = vi.spyOn(TestBed.inject(SidebarTreeFocusService), 'focusCreated');

      const cancelled = actions.create();
      await opened();
      button('Cancel').click();
      await closed();
      await cancelled;
      expect(focusCreated).not.toHaveBeenCalled();

      const done = actions.create();
      await opened();
      await until(() => {
        expect(document.activeElement).toBe(nameField());
      });
      type('Focused');
      button('Create folder').click();
      await closed();
      await done;

      const created = store.entities().find((folder) => folder.name === 'Focused');
      expect(focusCreated).toHaveBeenCalledWith(created?.id);
    });

    it('places the new folder inside the folder chosen in the Inside field', async () => {
      const { actions, store, router } = await setup();

      const done = actions.create();
      await opened();
      type('Essays');
      const inside = await overlayLoader().getHarness(UiSelectHarness.with({ label: 'Inside' }));
      await inside.chooseOption({ text: MOCK_NAME.FolderReading });
      await until(() => {
        expect(dialog().querySelector('h2')?.textContent).toBe(
          `New folder in “${MOCK_NAME.FolderReading}”`,
        );
      });
      button('Create folder').click();
      await closed();
      await done;

      const created = store.entities().find((folder) => folder.name === 'Essays');
      expect(created?.parentId).toBe(MOCK_ID.FolderReading);
      expect(router.url).toBe(`/folders/${created?.id}`);
    });

    it('has no axe violations', async () => {
      const { actions } = await setup();

      const done = actions.create();
      await opened();

      expect(await axeViolations(dialog())).toEqual([]);
      button('Cancel').click();
      await closed();
      await done;
    });

    it('names the parent in the title of a subfolder and creates it there', async () => {
      const { actions, store } = await setup();

      const done = actions.create(store.entityMap()[MOCK_ID.FolderReading]);
      await opened();

      expect(dialog().querySelector('h2')?.textContent).toBe(
        `New folder in “${MOCK_NAME.FolderReading}”`,
      );
      type('Essays');
      button('Create folder').click();
      await closed();
      await done;

      const created = store.entities().find((folder) => folder.name === 'Essays');
      expect(created?.parentId).toBe(MOCK_ID.FolderReading);
    });

    it('asks for a name and does not send an empty one', async () => {
      const { actions, store } = await setup();
      const before = store.count();

      const done = actions.create();
      await opened();
      type('   ');
      button('Create folder').click();
      await until(() => {
        expect(dialog().textContent).toContain('Enter a folder name');
      });

      expect(store.count()).toBe(before);
      button('Cancel').click();
      await closed();
      await done;
    });

    it('stays open with an error when the server refuses', async () => {
      const { actions, store } = await setup();
      const before = store.count();

      const done = actions.create();
      await opened();
      type(MOCK_FOLDER_NAME.CreateFails);
      button('Create folder').click();
      await until(() => {
        expect(dialog().textContent).toContain("Couldn't create the folder");
      });

      expect(store.count()).toBe(before);
      button('Cancel').click();
      await closed();
      await done;
    });
  });

  describe('rename', () => {
    it('shows the current name and renames', async () => {
      const { actions, store } = await setup();

      const done = actions.rename(store.entityMap()[MOCK_ID.FolderAngular]);
      await opened();
      expect(nameField().value).toBe(MOCK_NAME.FolderAngular);
      await until(() => {
        expect(document.activeElement).toBe(nameField());
      });
      type('NG');
      button('Rename').click();
      await closed();
      await done;

      expect(store.entityMap()[MOCK_ID.FolderAngular].name).toBe('NG');
    });

    it('puts the old name back and tells the user when the server refuses', async () => {
      const { actions, store } = await setup();
      const created = await store.create(MOCK_FOLDER_NAME.UpdateFails, null);

      const done = actions.rename(created ?? store.entities()[0]);
      await opened();
      type('Other');
      button('Rename').click();
      await closed();
      await done;

      await until(() => {
        expect(store.entityMap()[created?.id ?? ''].name).toBe(MOCK_FOLDER_NAME.UpdateFails);
        expect(document.body.textContent).toContain("Couldn't rename the folder");
      });
    });
  });

  describe('move', () => {
    it('does not offer the folder itself or anything below it', async () => {
      const { store } = await setup();
      const ref = TestBed.inject(DialogService).open<
        MoveFolderDialogComponent,
        boolean,
        MoveFolderDialogData
      >(MoveFolderDialogComponent, {
        data: { folder: store.entityMap()[MOCK_ID.FolderReading], submit: vi.fn() },
      });
      await opened();
      const options = (ref.componentInstance as unknown as { options(): SelectOption[] }).options();

      expect(options).toEqual([]);
      ref.close();
      await closed();
    });

    it('offers the other folders to a leaf', async () => {
      const { store } = await setup();
      const ref = TestBed.inject(DialogService).open<
        MoveFolderDialogComponent,
        boolean,
        MoveFolderDialogData
      >(MoveFolderDialogComponent, {
        data: { folder: store.entityMap()[MOCK_ID.FolderAngular], submit: vi.fn() },
      });
      await opened();
      const options = (ref.componentInstance as unknown as { options(): SelectOption[] }).options();

      expect(options.map((option) => option.id)).toEqual([MOCK_ID.FolderReading]);
      ref.close();
      await closed();
    });

    it('has no axe violations', async () => {
      const { actions, store } = await setup();

      const done = actions.move(store.entityMap()[MOCK_ID.FolderAngular]);
      await opened();

      expect(await axeViolations(dialog())).toEqual([]);
      button('Cancel').click();
      await closed();
      await done;
    });

    it('sends nothing when the parent is not changed', async () => {
      const { actions, store } = await setup();

      const done = actions.move(store.entityMap()[MOCK_ID.FolderAngular]);
      await opened();
      // The select keeps the old parent until the user picks one; saving without a change sends nothing.
      button('Move').click();
      await closed();
      await done;

      expect(store.entityMap()[MOCK_ID.FolderAngular].parentId).toBe(MOCK_ID.FolderReading);
    });
  });

  describe('move focus', () => {
    it('asks the sidebar tree for the moved row when the opener is gone', async () => {
      const { actions, store } = await setup();
      const restoreFocusNear = vi.fn(() => MOCK_ID.FolderReading);
      TestBed.inject(SidebarTreeFocusService).register({
        restoreFocusNear,
      } as unknown as TreeComponent);
      const opener = document.createElement('button');
      document.body.appendChild(opener);
      opener.focus();

      const done = actions.move(store.entityMap()[MOCK_ID.FolderAngular]);
      await opened();
      opener.remove();
      button('Move').click();
      await closed();
      await done;

      expect(restoreFocusNear).toHaveBeenCalledWith(MOCK_ID.FolderAngular);
    });

    it('leaves focus to the dialog when the opener still exists', async () => {
      const { actions, store } = await setup();
      const restoreFocusNear = vi.fn(() => null);
      TestBed.inject(SidebarTreeFocusService).register({
        restoreFocusNear,
      } as unknown as TreeComponent);
      const opener = document.createElement('button');
      document.body.appendChild(opener);
      opener.focus();

      const done = actions.move(store.entityMap()[MOCK_ID.FolderAngular]);
      await opened();
      button('Move').click();
      await closed();
      await done;

      expect(restoreFocusNear).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(opener);
      opener.remove();
    });
  });

  describe('delete', () => {
    it('counts the subtree and defaults to keeping the links', async () => {
      const { actions, store, data } = await setup();
      const linkCount = store.subtreeLinkCount(MOCK_ID.FolderReading);

      const done = actions.delete(store.entityMap()[MOCK_ID.FolderReading]);
      await opened();

      expect(dialog().querySelector('h2')?.textContent).toBe(
        `Delete folder “${MOCK_NAME.FolderReading}”?`,
      );
      expect(dialog().textContent).toContain(`It has ${linkCount} links and 1 subfolder.`);
      const radios = dialog().querySelectorAll<HTMLInputElement>('input[type="radio"]');
      expect(radios[0].checked).toBe(true);
      expect(radios[0].value).toBe(FOLDER_DELETE_MODE.MoveToUnsorted);
      button('Delete folder').click();
      await closed();
      await done;

      expect(store.count()).toBe(0);
      expect(data.links.every((link) => link.folderId === null)).toBe(true);
    });

    it('names the links in the button when deleting them too, and deletes them', async () => {
      const { actions, store, data } = await setup();
      const linkCount = store.subtreeLinkCount(MOCK_ID.FolderReading);
      const total = data.links.length;

      const done = actions.delete(store.entityMap()[MOCK_ID.FolderReading]);
      await opened();
      dialog().querySelector<HTMLInputElement>('input[value="delete-links"]')?.click();
      await until(() => {
        expect(button(`Delete folder and ${linkCount} links`)).toBeTruthy();
      });
      button(`Delete folder and ${linkCount} links`).click();
      await closed();
      await done;

      expect(data.links).toHaveLength(total - linkCount);
    });

    it('Cancel leaves a folder with links alone', async () => {
      const { actions, store, data } = await setup();
      const before = data.links.length;

      const done = actions.delete(store.entityMap()[MOCK_ID.FolderReading]);
      await opened();
      expect(await axeViolations(dialog())).toEqual([]);
      button('Cancel').click();
      await closed();
      await done;

      expect(store.entityMap()[MOCK_ID.FolderReading]).toBeDefined();
      expect(data.links).toHaveLength(before);
    });

    it('asks nothing about the links of an empty folder', async () => {
      const { actions, store } = await setup();
      const created = await store.create('Empty', null);

      const done = actions.delete(created ?? store.entities()[0]);
      await opened();

      expect(dialog().textContent).toContain('This folder is empty.');
      expect(dialog().querySelector('input[type="radio"]')).toBeNull();
      button('Cancel').click();
      await closed();
      await done;
      expect(store.entityMap()[created?.id ?? '']).toBeDefined();
    });

    it('leaves the page of the deleted folder', async () => {
      const { actions, store, router } = await setup();
      await router.navigateByUrl(`/folders/${MOCK_ID.FolderAngular}`);

      const done = actions.delete(store.entityMap()[MOCK_ID.FolderReading]);
      await opened();
      button('Delete folder').click();
      await closed();
      await done;

      expect(router.url).toBe('/links');
    });

    it('stays open with an error when the server refuses', async () => {
      const { actions, store } = await setup();
      const created = await store.create(MOCK_FOLDER_NAME.DeleteFails, null);

      const done = actions.delete(created ?? store.entities()[0]);
      await opened();
      button('Delete folder').click();
      await until(() => {
        expect(dialog().textContent).toContain("Couldn't delete the folder");
      });

      expect(store.entityMap()[created?.id ?? '']).toBeDefined();
      button('Cancel').click();
      await closed();
      await done;
    });
  });

  describe('add link here', () => {
    it('opens the add-link dialog on the folder and names its path in the toast', async () => {
      const { actions } = await setup();
      const open = vi.spyOn(TestBed.inject(AddLinkDialogService), 'open').mockResolvedValue({
        action: ADD_LINK_ACTION.Saved,
        link: { ...MOCK_LINKS[0], folderId: MOCK_ID.FolderReading },
      });
      const show = vi.spyOn(TestBed.inject(ToastService), 'show');

      await actions.addLinkHere(TestBed.inject(FoldersStore).entityMap()[MOCK_ID.FolderReading]);

      expect(open).toHaveBeenCalledWith({ folderId: MOCK_ID.FolderReading });
      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({ title: `Saved to ${MOCK_NAME.FolderReading}` }),
      );
    });
  });
});
