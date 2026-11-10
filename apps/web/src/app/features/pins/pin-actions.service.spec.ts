import { TestBed } from '@angular/core/testing';
import { PIN_KIND, PIN_LIMIT } from '@shelfmark/contracts';
import { MOCK_FOLDERS } from '@shelfmark/contracts/testing';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { PinsStore } from '../../stores/pins.store';
import { loadEnglish, provideTranslocoForTest } from '../../testing/transloco-testing';
import { FOLDERS_API } from '../links/models/folders-api.const';
import { LINKS_API } from '../links/models/links-api.const';
import { MockFoldersApi } from '../links/mock/mock-folders.api';
import { MockLibraryData } from '../links/mock/mock-library-data';
import { MockLinksApi } from '../links/mock/mock-links.api';
import { PinActionsService } from './pin-actions.service';
import { MockPinsApi } from './mock/mock-pins.api';
import { PINS_API } from './models/pins-api.const';

async function setup() {
  const toasts = { show: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: ToastService, useValue: toasts },
      { provide: PINS_API, useClass: MockPinsApi },
      { provide: FOLDERS_API, useClass: MockFoldersApi },
      { provide: LINKS_API, useClass: MockLinksApi },
    ],
  });
  await loadEnglish();
  return {
    toasts,
    actions: TestBed.inject(PinActionsService),
    pins: TestBed.inject(PinsStore),
    data: TestBed.inject(MockLibraryData),
  };
}

describe('PinActionsService', () => {
  it('pins and unpins a folder and a link', async () => {
    const { actions, pins, data } = await setup();
    const folder = data.foldersView()[0];

    await actions.pinFolder(folder);
    await actions.pinLink(data.links[0]);

    expect(pins.rows().map((row) => row.kind)).toEqual([PIN_KIND.Folder, PIN_KIND.Link]);

    await actions.unpinFolder(folder);
    expect(pins.rows().map((row) => row.kind)).toEqual([PIN_KIND.Link]);
  });

  it('explains the limit with a toast when the eighth item is pinned', async () => {
    const { actions, pins, toasts, data } = await setup();
    const folders = data.foldersView();
    for (let index = 0; index < PIN_LIMIT.Max; index++) {
      await pins.pin({ kind: PIN_KIND.Link, id: data.links[index].id });
    }

    await actions.pinFolder(folders[0]);

    expect(pins.count()).toBe(PIN_LIMIT.Max);
    expect(toasts.show).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: TOAST_KIND.Warn,
        title: 'Pinned is full',
        detail: `You can pin up to ${PIN_LIMIT.Max} folders and links. Unpin one first.`,
      }),
    );
  });

  it('moves an item and toasts when the order cannot be saved', async () => {
    const { actions, pins, toasts, data } = await setup();
    await pins.pin({ kind: PIN_KIND.Folder, id: MOCK_FOLDERS[0].id });
    await pins.pin({ kind: PIN_KIND.Link, id: data.links[0].id });

    await actions.move(1, 0);
    expect(pins.rows()[0].kind).toBe(PIN_KIND.Link);

    data.pins = [];
    await actions.move(0, 1);
    expect(toasts.show).toHaveBeenCalledWith(
      expect.objectContaining({ kind: TOAST_KIND.Danger, title: "Couldn't change the order" }),
    );
  });
});
