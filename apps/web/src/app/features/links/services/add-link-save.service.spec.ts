import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import type { FolderResponse, LinkPreviewResponse, LinkResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_LIBRARY_COUNTS, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { TOAST_KIND, ToastService, UI_DIALOG_DATA, UiDialogRef } from '@shelfmark/ui';
import { of, throwError } from 'rxjs';
import { AppTranslocoLoader } from '../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../core/i18n/transloco.config';
import { FOLDERS_API } from '../models/folders-api.const';
import { LINKS_API } from '../models/links-api.const';
import type { AddLinkDialogData } from '../models/add-link-dialog-data.interface';
import type { LinksApi } from '../models/links-api.interface';
import type { FoldersApi } from '../models/folders-api.interface';
import { NEW_FOLDER_OPTION_ID } from '../models/new-folder-option-id.const';
import { FoldersStore } from '../../../stores/folders.store';
import { AddLinkNewFolderService } from './add-link-new-folder.service';
import { ADD_LINK_ACTION } from '../models/add-link-action.const';
import { AddLinkFormService } from './add-link-form.service';
import { AddLinkPreviewService } from './add-link-preview.service';
import { AddLinkSaveService } from './add-link-save.service';

const NOT_FETCHED: LinkPreviewResponse = {
  preview: { ...MOCK_LINKS[0], title: 'x', description: null, imageUrl: null, faviconUrl: null },
  duplicate: null,
  fetched: false,
};

async function setup(link?: LinkResponse, folderFails = false) {
  const foldersApi = {
    list: vi.fn<FoldersApi['list']>(() =>
      of({ items: [MOCK_FOLDERS[0]], counts: MOCK_LIBRARY_COUNTS }),
    ),
    create: vi.fn<FoldersApi['create']>((request) =>
      folderFails
        ? throwError(() => new Error('offline'))
        : of<FolderResponse>({ ...MOCK_FOLDERS[0], id: 'created-id', name: request.name }),
    ),
  };
  const toasts = { show: vi.fn() };
  const api = {
    preview: vi.fn<LinksApi['preview']>(() => of(NOT_FETCHED)),
    create: vi.fn<LinksApi['create']>((request) =>
      of<LinkResponse>({ ...MOCK_LINKS[0], url: request.url }),
    ),
    update: vi.fn<LinksApi['update']>((id, request) =>
      of<LinkResponse>({ ...MOCK_LINKS[0], id, ...request }),
    ),
  };
  const close = vi.fn();
  const data: AddLinkDialogData = {
    link,
    session: { saving: null, idempotencyKey: null, sentFingerprint: null },
  };
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: LINKS_API, useValue: api },
      { provide: FOLDERS_API, useValue: foldersApi },
      { provide: ToastService, useValue: toasts },
      { provide: UI_DIALOG_DATA, useValue: data },
      { provide: UiDialogRef, useValue: { close, locked: () => false } },
      AddLinkFormService,
      AddLinkPreviewService,
      AddLinkSaveService,
      AddLinkNewFolderService,
    ],
  });
  await new Promise<void>((resolve) => {
    TestBed.inject(TranslocoService)
      .load(APP_LANG.En)
      .subscribe(() => {
        resolve();
      });
  });
  await TestBed.inject(FoldersStore).load();
  return {
    api,
    foldersApi,
    toasts,
    newFolder: TestBed.inject(AddLinkNewFolderService),
    close,
    data,
    form: TestBed.inject(AddLinkFormService),
    save: TestBed.inject(AddLinkSaveService),
  };
}

describe('AddLinkSaveService', () => {
  it('creates a link and keeps the save for the service', async () => {
    const { api, close, data, form, save } = await setup();
    form.form.url().value.set('https://example.org/a');
    await save.save();
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledWith(expect.objectContaining({ action: ADD_LINK_ACTION.Saved }));
    expect(data.session.saving).not.toBeNull();
    // The spinner stays on while the dialog leaves: a second submit is ignored.
    await save.save();
    expect(api.create).toHaveBeenCalledTimes(1);
  });

  it('saves an address typed without a scheme as https:// (#405)', async () => {
    const { api, form, save } = await setup();
    form.form.url().value.set(' example.com ');
    await save.save();
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://example.com' }),
    );
  });

  it('sends a changed address without a scheme as https:// when editing', async () => {
    const { api, form, save } = await setup(MOCK_LINKS[0]);
    form.form.url().value.set('example.com/new');
    await save.save();
    expect(api.update).toHaveBeenCalledWith(
      MOCK_LINKS[0].id,
      expect.objectContaining({ url: 'https://example.com/new' }),
    );
  });

  it('reuses the key when a failed save is retried with the same payload', async () => {
    const { api, form, save } = await setup();
    api.create.mockImplementationOnce(() => throwError(() => new Error('boom')));
    form.form.url().value.set('https://example.org/a');
    await save.save();
    await save.save();
    const [first, second] = api.create.mock.calls.map(([request]) => request.idempotencyKey);
    expect(first).toBeDefined();
    expect(second).toBe(first);
  });

  it('uses a new key when the payload changed', async () => {
    const { api, form, save } = await setup();
    api.create.mockImplementationOnce(() => throwError(() => new Error('boom')));
    form.form.url().value.set('https://example.org/a');
    await save.save();
    form.form.url().value.set('https://example.org/b');
    await save.save();
    const [first, second] = api.create.mock.calls.map(([request]) => request.idempotencyKey);
    expect(second).not.toBe(first);
  });

  it('sends only the changed fields when editing, nothing when nothing changed', async () => {
    const link = MOCK_LINKS[0];
    const { api, close, form, save } = await setup(link);
    await save.save();
    expect(api.update).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledWith();
    form.form.note().value.set('New note');
    await save.save();
    expect(api.update).toHaveBeenCalledWith(link.id, { note: 'New note' });
  });

  it('keeps the dialog open and reports the error when the save fails', async () => {
    const { api, close, form, save } = await setup();
    api.create.mockImplementationOnce(() => throwError(() => new Error('boom')));
    form.form.url().value.set('https://example.org/a');
    await save.save();
    expect(close).not.toHaveBeenCalled();
    expect(save.saving()).toBe(false);
    expect(save.saveError()).not.toBeNull();
  });

  describe('a folder named in the dialog (#454)', () => {
    it('is created first and the link goes into it; a retry does not create it again', async () => {
      const { api, foldersApi, form, newFolder, save, toasts } = await setup();
      api.create.mockImplementationOnce(() => throwError(() => new Error('boom')));
      form.form.url().value.set('https://example.org/a');
      form.form.folderId().value.set(newFolder.choose('Recipes'));
      await save.save();
      expect(foldersApi.create).toHaveBeenCalledWith({ name: 'Recipes' });
      expect(api.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ folderId: 'created-id' }),
      );
      expect(form.model().folderId).toBe('created-id');
      await save.save();
      expect(foldersApi.create).toHaveBeenCalledTimes(1);
      expect(api.create).toHaveBeenCalledTimes(2);
      expect(toasts.show).not.toHaveBeenCalled();
    });

    it('saves the link without a folder and warns when the folder cannot be created', async () => {
      const { api, close, form, newFolder, save, toasts } = await setup(undefined, true);
      form.form.url().value.set('https://example.org/a');
      form.form.folderId().value.set(newFolder.choose('Recipes'));
      await save.save();
      const request = api.create.mock.calls[0][0];
      expect(request.folderId).toBeUndefined();
      expect(close).toHaveBeenCalledWith(
        expect.objectContaining({ action: ADD_LINK_ACTION.Saved }),
      );
      expect(toasts.show).toHaveBeenCalledWith({
        kind: TOAST_KIND.Warn,
        title: 'Couldn’t create the folder “Recipes”',
        detail: 'The link is saved without a folder.',
      });
    });

    it('moves an edited link into the new folder', async () => {
      const link = MOCK_LINKS[0];
      const { api, form, newFolder, save } = await setup(link);
      form.form.folderId().value.set(newFolder.choose('Recipes'));
      await save.save();
      expect(api.update).toHaveBeenCalledWith(link.id, { folderId: 'created-id' });
    });

    it('never sends the placeholder id', async () => {
      const { api, form, save } = await setup();
      form.form.url().value.set('https://example.org/a');
      form.form.folderId().value.set(NEW_FOLDER_OPTION_ID);
      await save.save();
      expect(api.create.mock.calls[0][0].folderId).toBeUndefined();
    });
  });
});
