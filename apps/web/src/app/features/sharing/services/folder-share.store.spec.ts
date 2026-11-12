import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import type { FolderShareResponse } from '@shelfmark/contracts';
import { of, throwError } from 'rxjs';
import { FolderShareStore } from './folder-share.store';
import { SHARE_ERROR } from '../models/share-error.const';
import { SHARES_API } from '../models/shares-api.const';
import type { SharesApi } from '../models/shares-api.interface';

const FOLDER = 'f1';
const OFF: FolderShareResponse = {
  folderId: FOLDER,
  enabled: false,
  token: null,
  showNotes: false,
  createdAt: null,
};
const ON: FolderShareResponse = {
  folderId: FOLDER,
  enabled: true,
  token: 'sampleToken-sampleToke',
  showNotes: false,
  createdAt: '2026-11-11T00:00:00.000Z',
};

function setup(api: Partial<SharesApi>) {
  TestBed.configureTestingModule({
    providers: [FolderShareStore, { provide: SHARES_API, useValue: api }],
  });
  return TestBed.inject(FolderShareStore);
}

const failing = (status: number) => () => throwError(() => new HttpErrorResponse({ status }));

describe('FolderShareStore', () => {
  it('loads the state and turns the link on and off', async () => {
    const store = setup({
      get: () => of(OFF),
      enable: () => of(ON),
      disable: () => of(undefined),
    });
    await store.load(FOLDER);
    expect(store.enabled()).toBe(false);

    expect(await store.setEnabled(true)).toBe(true);
    expect(store.token()).toBe(ON.token);

    expect(await store.setEnabled(false)).toBe(true);
    expect(store.share()).toEqual(OFF);
  });

  it('keeps the last state and names the error when a change fails', async () => {
    const store = setup({ get: () => of(OFF), enable: failing(409) });
    await store.load(FOLDER);

    expect(await store.setEnabled(true)).toBe(false);
    expect(store.enabled()).toBe(false);
    expect(store.error()).toBe(SHARE_ERROR.Limit);
  });

  it('maps 403 to the demo error and anything else to save', async () => {
    const demo = setup({ get: () => of(OFF), enable: failing(403) });
    await demo.load(FOLDER);
    await demo.setEnabled(true);
    expect(demo.error()).toBe(SHARE_ERROR.Demo);

    TestBed.resetTestingModule();
    const other = setup({ get: () => of(ON), setShowNotes: failing(500), reset: failing(0) });
    await other.load(FOLDER);
    expect(await other.setShowNotes(true)).toBe(false);
    expect(other.error()).toBe(SHARE_ERROR.Save);
    other.clearError();
    expect(other.error()).toBeNull();
    expect(await other.reset()).toBe(false);
    expect(other.showNotes()).toBe(false);
  });

  it('reports a failed load and changes nothing before a load', async () => {
    const store = setup({ get: failing(500), enable: () => of(ON) });
    expect(await store.setEnabled(true)).toBe(false);
    await store.load(FOLDER);
    expect(store.error()).toBe(SHARE_ERROR.Load);
    expect(store.loading()).toBe(false);
  });

  it('applies settings and a reset from the server answer', async () => {
    const store = setup({
      get: () => of(ON),
      setShowNotes: () => of({ ...ON, showNotes: true }),
      reset: () => of({ ...ON, token: 'A'.repeat(22) }),
    });
    await store.load(FOLDER);
    await store.setShowNotes(true);
    expect(store.showNotes()).toBe(true);
    await store.reset();
    expect(store.token()).toBe('A'.repeat(22));
  });
});
