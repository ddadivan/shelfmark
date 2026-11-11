import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SHARE_LIMIT, SHARE_TOKEN_PATTERN, type FolderResponse } from '@shelfmark/contracts';
import { MOCK_ID } from '@shelfmark/contracts/testing';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth.store';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MOCK_SHARES_STORAGE_KEY } from '../models/mock-shares-storage-key.const';
import { MockSharesApi } from './mock-shares.api';

function setup(
  user: { name: string; isDemo: boolean } | null = { name: 'Ada Lovelace', isDemo: false },
) {
  localStorage.removeItem(MOCK_SHARES_STORAGE_KEY);
  TestBed.configureTestingModule({
    providers: [{ provide: AuthStore, useValue: { user: signal(user) } }],
  });
  return { api: TestBed.inject(MockSharesApi), data: TestBed.inject(MockLibraryData) };
}

async function status(promise: Promise<unknown>): Promise<number> {
  try {
    await promise;
    return 0;
  } catch (error) {
    return error instanceof HttpErrorResponse ? error.status : -1;
  }
}

describe('MockSharesApi', () => {
  afterEach(() => localStorage.removeItem(MOCK_SHARES_STORAGE_KEY));

  it('enables, keeps the token, changes notes, resets and disables like the API', async () => {
    const { api } = setup();
    const folder = MOCK_ID.FolderReading;

    expect(await firstValueFrom(api.get(folder))).toMatchObject({ enabled: false, token: null });
    const on = await firstValueFrom(api.enable(folder));
    expect(on.token).toMatch(SHARE_TOKEN_PATTERN);
    expect((await firstValueFrom(api.enable(folder))).token).toBe(on.token);

    expect((await firstValueFrom(api.setShowNotes(folder, true))).showNotes).toBe(true);
    const reset = await firstValueFrom(api.reset(folder));
    expect(reset.token).not.toBe(on.token);
    expect(await status(firstValueFrom(api.collection(on.token ?? '', {})))).toBe(404);

    await firstValueFrom(api.disable(folder));
    expect(await firstValueFrom(api.get(folder))).toMatchObject({ enabled: false });
    expect(await status(firstValueFrom(api.collection(reset.token ?? '', {})))).toBe(404);
    expect(await status(firstValueFrom(api.reset(folder)))).toBe(404);
  });

  it('builds the public page from the subtree, notes only when allowed', async () => {
    const { api, data } = setup();
    const token = (await firstValueFrom(api.enable(MOCK_ID.FolderReading))).token ?? '';
    const page = await firstValueFrom(api.collection(token, {}));
    const inTree = data.links.filter(
      (link) => link.folderId === MOCK_ID.FolderReading || link.folderId === MOCK_ID.FolderAngular,
    );

    expect(page.ownerName).toBe('Ada');
    expect(page.linkCount).toBe(inTree.length);
    expect(page.subfolders.map((folder) => folder.id)).toEqual([MOCK_ID.FolderAngular]);
    expect(page.items.length).toBe(Math.min(inTree.length, SHARE_LIMIT.PageSize));
    expect(page.items.every((link) => link.note === null)).toBe(true);

    await firstValueFrom(api.setShowNotes(MOCK_ID.FolderReading, true));
    const withNotes = await firstValueFrom(api.collection(token, {}));
    expect(withNotes.items.some((link) => link.note !== null)).toBe(true);

    const angular = await firstValueFrom(api.collection(token, { folder: MOCK_ID.FolderAngular }));
    expect(angular.items.length).toBe(
      data.links.filter((link) => link.folderId === MOCK_ID.FolderAngular).length,
    );
    expect(await status(firstValueFrom(api.collection(token, { folder: 'elsewhere' })))).toBe(404);
  });

  it('refuses demo users and the eleventh folder', async () => {
    expect(
      await status(
        firstValueFrom(setup({ name: 'Demo', isDemo: true }).api.enable(MOCK_ID.FolderReading)),
      ),
    ).toBe(403);

    TestBed.resetTestingModule();
    const { api, data } = setup();
    const now = new Date().toISOString();
    const extra: FolderResponse[] = Array.from({ length: SHARE_LIMIT.PerUserMax }, (_, i) => ({
      id: `00000000-0000-4000-8000-0000000009${String(i).padStart(2, '0')}`,
      parentId: null,
      name: `Extra ${i}`,
      linkCount: 0,
      createdAt: now,
      updatedAt: now,
    }));
    data.setFolders([...data.folderList, ...extra]);
    for (const folder of extra) await firstValueFrom(api.enable(folder.id));
    expect(await status(firstValueFrom(api.enable(MOCK_ID.FolderReading)))).toBe(409);
    expect(await status(firstValueFrom(api.get('missing')))).toBe(404);
  });
});
