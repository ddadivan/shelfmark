import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { FOLDER_LIMIT, type FolderResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_LIBRARY_COUNTS } from '@shelfmark/contracts/testing';
import { of, throwError } from 'rxjs';
import { AppTranslocoLoader } from '../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../core/i18n/transloco.config';
import { FoldersStore } from '../../../stores/folders.store';
import { FOLDERS_API } from '../models/folders-api.const';
import type { FoldersApi } from '../models/folders-api.interface';
import { NEW_FOLDER_OPTION_ID } from '../models/new-folder-option-id.const';
import { AddLinkNewFolderService } from './add-link-new-folder.service';

const EXISTING = MOCK_FOLDERS[0];

async function setup(fails = false) {
  const api = {
    list: vi.fn<FoldersApi['list']>(() => of({ items: [EXISTING], counts: MOCK_LIBRARY_COUNTS })),
    create: vi.fn<FoldersApi['create']>((request) =>
      fails
        ? throwError(() => new Error('offline'))
        : of<FolderResponse>({ ...EXISTING, id: 'created-id', name: request.name, parentId: null }),
    ),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: FOLDERS_API, useValue: api },
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
  return { api, service: TestBed.inject(AddLinkNewFolderService) };
}

describe('AddLinkNewFolderService', () => {
  it('chooses an existing folder of the same name, ignoring case, and creates nothing', async () => {
    const { api, service } = await setup();
    expect(service.choose(`  ${EXISTING.name.toUpperCase()} `)).toBe(EXISTING.id);
    expect(service.name()).toBeNull();
    expect(await service.resolve(EXISTING.id)).toEqual({
      folderId: EXISTING.id,
      failedName: null,
    });
    expect(api.create).not.toHaveBeenCalled();
  });

  it('keeps a new name pending, shown last with the "New" badge, until Save', async () => {
    const { api, service } = await setup();
    expect(service.choose('  Recipes ')).toBe(NEW_FOLDER_OPTION_ID);
    expect(service.name()).toBe('Recipes');
    expect(service.options().at(-1)).toEqual({
      id: NEW_FOLDER_OPTION_ID,
      name: 'Recipes',
      badge: 'New',
    });
    expect(api.create).not.toHaveBeenCalled();
  });

  it('ignores a blank name and cuts a long one to the folder limit', async () => {
    const { service } = await setup();
    expect(service.choose('   ')).toBeNull();
    service.choose('x'.repeat(FOLDER_LIMIT.NameMax + 20));
    expect(service.name()).toHaveLength(FOLDER_LIMIT.NameMax);
  });

  it('creates the pending folder on Save at the top level, once', async () => {
    const { api, service } = await setup();
    service.choose('Recipes');
    expect(await service.resolve(NEW_FOLDER_OPTION_ID)).toEqual({
      folderId: 'created-id',
      failedName: null,
    });
    expect(api.create).toHaveBeenCalledWith({ name: 'Recipes' });
    expect(service.name()).toBeNull();
    expect(service.options().some((option) => option.id === NEW_FOLDER_OPTION_ID)).toBe(false);
  });

  it('reuses a folder of that name that turned up before Save', async () => {
    const { api, service } = await setup();
    service.choose('Recipes');
    api.create.mockClear();
    await TestBed.inject(FoldersStore).create('recipes', null);
    api.create.mockClear();
    expect(await service.resolve(NEW_FOLDER_OPTION_ID)).toEqual({
      folderId: 'created-id',
      failedName: null,
    });
    expect(api.create).not.toHaveBeenCalled();
  });

  it('leaves the link without a folder when creating fails, and says which name', async () => {
    const { service } = await setup(true);
    service.choose('Recipes');
    expect(await service.resolve(NEW_FOLDER_OPTION_ID)).toEqual({
      folderId: null,
      failedName: 'Recipes',
    });
    expect(service.name()).toBeNull();
  });

  it('passes any other folder through and never sends the placeholder id', async () => {
    const { service } = await setup();
    expect(await service.resolve(null)).toEqual({ folderId: null, failedName: null });
    expect(await service.resolve(NEW_FOLDER_OPTION_ID)).toEqual({
      folderId: null,
      failedName: null,
    });
  });
});
