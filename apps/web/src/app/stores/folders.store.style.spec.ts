import { TestBed } from '@angular/core/testing';
import { FOLDER_COLOUR, FOLDER_ICON, type FolderResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_LIBRARY_COUNTS } from '@shelfmark/contracts/testing';
import { of, Subject, throwError } from 'rxjs';
import { FOLDERS_API } from '../features/links/models/folders-api.const';
import type { FoldersApi } from '../features/links/models/folders-api.interface';
import { LINKS_API } from '../features/links/models/links-api.const';
import { FoldersStore } from './folders.store';

const WORK: FolderResponse = { ...MOCK_FOLDERS[0], id: 'w', name: 'Work', parentId: null };

function setup() {
  const api = {
    list: vi.fn<FoldersApi['list']>(() => of({ items: [WORK], counts: MOCK_LIBRARY_COUNTS })),
    create: vi.fn<FoldersApi['create']>(),
    update: vi.fn<FoldersApi['update']>((_id, request) =>
      of({ ...WORK, ...request, updatedAt: 'later' }),
    ),
    remove: vi.fn<FoldersApi['remove']>(),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: FOLDERS_API, useValue: api },
      { provide: LINKS_API, useValue: {} },
    ],
  });
  return { api, store: TestBed.inject(FoldersStore) };
}

describe('FoldersStore setStyle', () => {
  it('shows the new colour and icon at once and sends only what was chosen', async () => {
    const { store, api } = setup();
    await store.load();
    const pending = new Subject<FolderResponse>();
    api.update.mockImplementation(() => pending);

    const result = store.setStyle('w', { colour: FOLDER_COLOUR.Clay, icon: FOLDER_ICON.Star });
    expect(store.entityMap()['w']).toMatchObject({ colour: 'clay', icon: 'star' });
    pending.next({ ...WORK, colour: 'clay', icon: 'star', updatedAt: 'later' });
    pending.complete();

    expect(await result).toBe(true);
    expect(api.update).toHaveBeenCalledWith('w', { colour: 'clay', icon: 'star' });
    expect(store.entityMap()['w'].updatedAt).toBe('later');
  });

  it('puts the old style back when the request fails', async () => {
    const { store, api } = setup();
    await store.load();
    api.update.mockImplementation(() => throwError(() => new Error('down')));

    expect(await store.setStyle('w', { colour: FOLDER_COLOUR.Rose })).toBe(false);

    expect(store.entityMap()['w'].colour).toBe(WORK.colour);
  });

  it('does not undo a later choice when an earlier request fails', async () => {
    const { store, api } = setup();
    await store.load();
    const first = new Subject<FolderResponse>();
    api.update.mockImplementationOnce(() => first);

    const failing = store.setStyle('w', { colour: FOLDER_COLOUR.Rose });
    await store.setStyle('w', { colour: FOLDER_COLOUR.Teal });
    first.error(new Error('down'));
    await failing;

    expect(store.entityMap()['w'].colour).toBe('teal');
  });

  it('refuses an unknown folder without a request', async () => {
    const { store, api } = setup();
    await store.load();

    expect(await store.setStyle('nope', { colour: FOLDER_COLOUR.Rose })).toBe(false);

    expect(api.update).not.toHaveBeenCalled();
  });

  it('keeps the trimmed description the server answers and rolls a failed one back (#418)', async () => {
    const { store, api } = setup();
    await store.load();
    api.update.mockImplementationOnce(() =>
      of({ ...WORK, description: 'Trimmed', updatedAt: 'later' }),
    );

    expect(await store.setStyle('w', { description: ' Trimmed ' })).toBe(true);
    expect(store.entityMap()['w'].description).toBe('Trimmed');

    api.update.mockImplementationOnce(() => throwError(() => new Error('down')));
    expect(await store.setStyle('w', { description: null })).toBe(false);
    expect(store.entityMap()['w'].description).toBe('Trimmed');
  });

  it('shows a new cover at once, takes the server path and rolls a failed one back (#418)', async () => {
    const { store, api } = setup();
    await store.load();
    const pending = new Subject<FolderResponse>();
    api.update.mockImplementationOnce(() => pending);

    const result = store.setStyle('w', { coverLinkId: 'l1' }, '/optimistic.png');
    expect(store.entityMap()['w']).toMatchObject({
      coverLinkId: 'l1',
      coverUrl: '/optimistic.png',
    });
    pending.next({ ...WORK, coverLinkId: 'l1', coverUrl: '/server.png', updatedAt: 'later' });
    pending.complete();
    expect(await result).toBe(true);
    expect(store.entityMap()['w'].coverUrl).toBe('/server.png');

    api.update.mockImplementationOnce(() => throwError(() => new Error('down')));
    expect(await store.setStyle('w', { coverLinkId: null })).toBe(false);
    expect(store.entityMap()['w']).toMatchObject({ coverLinkId: 'l1', coverUrl: '/server.png' });
  });
});
