import {
  LIBRARY_SETTINGS_DEFAULT,
  type LibrarySettings,
  type UpdateUserSettingsRequest,
} from '@shelfmark/contracts';
import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TRASH_ITEM_KIND } from '@shelfmark/contracts';
import { DialogService, ToastService, TOAST_KIND } from '@shelfmark/ui';
import { of, switchMap, throwError, timer } from 'rxjs';
import { axeViolations } from '../../../../testing/axe';
import { setupSettingsPage } from '../../../../testing/settings-page-testbed';
import { TRASH_API } from '../../trash/models/trash-api.const';
import type { TrashApi } from '../../trash/models/trash-api.interface';
import { USER_SETTINGS_API } from '../models/user-settings-api.const';
import type { UserSettingsApi } from '../models/user-settings-api.interface';
import LibrarySettingsPage from './library.page';

/** The Settings › Library fields of a request, as the server would answer them. */
function libraryPart(request: UpdateUserSettingsRequest): Partial<LibrarySettings> {
  const part: Partial<LibrarySettings> = {};
  for (const key of Object.keys(LIBRARY_SETTINGS_DEFAULT) as (keyof LibrarySettings)[]) {
    if (request[key] !== undefined) {
      Object.assign(part, { [key]: request[key] });
    }
  }
  return part;
}

function switchNamed(root: HTMLElement, name: string): HTMLButtonElement {
  const found = root.querySelector<HTMLButtonElement>(
    `button[role="switch"][aria-label="${name}"]`,
  );
  if (!found) {
    throw new Error(`No switch "${name}"`);
  }
  return found;
}

async function setup(
  options: { total?: number; failUpdate?: boolean; failGet?: boolean; confirm?: boolean } = {},
) {
  const settingsApi = {
    get: vi.fn<UserSettingsApi['get']>(() =>
      options.failGet
        ? throwError(() => new Error('down'))
        : of({
            trashRetentionDays: 30 as const,
            folderColours: true,
            pauseHistory: false,
            ...MOCK_APPEARANCE_DEFAULTS,
            ...LIBRARY_SETTINGS_DEFAULT,
          }),
    ),
    update: vi.fn<UserSettingsApi['update']>((request) =>
      options.failUpdate
        ? timer(10).pipe(switchMap(() => throwError(() => new Error('boom'))))
        : of({
            trashRetentionDays: request.trashRetentionDays ?? 30,
            folderColours: request.folderColours ?? true,
            pauseHistory: request.pauseHistory ?? false,
            ...MOCK_APPEARANCE_DEFAULTS,
            ...LIBRARY_SETTINGS_DEFAULT,
            ...libraryPart(request),
          }),
    ),
  };
  const total = options.total ?? 0;
  const trashApi = {
    list: vi.fn<TrashApi['list']>(() =>
      of({
        items: Array.from({ length: total }, (_, i) => ({
          kind: TRASH_ITEM_KIND.Link,
          id: `l${i}`,
          title: `Link ${i}`,
          url: 'https://example.com/',
          faviconUrl: null,
          imageUrl: null,
          fromFolderName: null,
          linkCount: null,
          deletedAt: new Date(Date.now() - 9 * 86_400_000).toISOString(),
          expiresAt: new Date(Date.now() + 21 * 86_400_000).toISOString(),
        })),
        total,
        retentionDays: 30 as const,
      }),
    ),
  };
  const confirm = vi.fn(() => Promise.resolve(options.confirm ?? true));
  const open = vi.fn(() => ({ result: Promise.resolve(undefined) }));
  const toasts: Parameters<ToastService['show']>[0][] = [];
  TestBed.configureTestingModule({
    providers: [
      { provide: USER_SETTINGS_API, useValue: settingsApi },
      { provide: TRASH_API, useValue: trashApi },
      { provide: DialogService, useValue: { confirm, open } },
      {
        provide: ToastService,
        useValue: { show: (toast: (typeof toasts)[number]) => toasts.push(toast) },
      },
    ],
  });
  const page = await setupSettingsPage(LibrarySettingsPage, 'library');
  await vi.waitFor(() => {
    page.harness.fixture.detectChanges();
    expect(page.root.querySelector('input[type="radio"]:not(:disabled)')).not.toBeNull();
  });
  return { ...page, settingsApi, trashApi, toasts, confirm, open };
}

function radio(root: HTMLElement, label: string): HTMLInputElement {
  const found = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]')).find(
    (input) => input.closest('label')?.textContent?.includes(label),
  );
  if (!found) {
    throw new Error(`No radio "${label}"`);
  }
  return found;
}

describe('LibrarySettingsPage', () => {
  it('has the Trash section with the retention choices, the saved one selected', async () => {
    const { root } = await setup();

    expect(root.querySelector('h1')?.textContent).toContain('Library');
    expect([...root.querySelectorAll('h2')].map((h) => h.textContent?.trim())).toEqual([
      'Viewing',
      'Saving',
      'Tags and folders',
      'Trash',
    ]);
    expect(root.textContent).toContain('Keep deleted items for');
    expect(
      Array.from(root.querySelectorAll('input[type="radio"]')).map((input) =>
        input.closest('label')?.textContent?.trim(),
      ),
    ).toEqual(['Cards', 'List', 'New tab', 'Same tab', '7 days', '30 days', '90 days']);
    expect(radio(root, '30 days').checked).toBe(true);
  });

  it('saves a choice at once through the settings seam', async () => {
    const { root, settingsApi, harness } = await setup();

    radio(root, '90 days').click();
    await harness.fixture.whenStable();

    expect(settingsApi.update).toHaveBeenCalledWith({ trashRetentionDays: 90 });
    expect(radio(root, '90 days').checked).toBe(true);
  });

  it('goes back to the old choice with an error toast when saving fails', async () => {
    const { root, toasts, harness } = await setup({ failUpdate: true });

    radio(root, '7 days').click();
    await harness.fixture.whenStable();
    await vi.waitFor(() => expect(toasts).toHaveLength(1));
    harness.fixture.detectChanges();

    expect(toasts[0]).toMatchObject({
      kind: TOAST_KIND.Danger,
      title: "Couldn't save the setting",
      detail: 'It is back to 30 days.',
    });
    expect(radio(root, '30 days').checked).toBe(true);
  });

  describe('shortening the retention', () => {
    it('asks first when items in Trash are older than the new value, and saves on confirm', async () => {
      const { root, settingsApi, confirm, harness } = await setup({ total: 3 });
      await vi.waitFor(() => expect(root.textContent).toContain('3 items'));

      radio(root, '7 days').click();
      await harness.fixture.whenStable();

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          destructive: true,
          message: '3 items in Trash are older than 7 days and will be deleted for good tonight.',
          confirmLabel: 'Keep for 7 days',
          cancelLabel: 'Cancel',
        }),
      );
      expect(settingsApi.update).toHaveBeenCalledWith({ trashRetentionDays: 7 });
    });

    it('saves nothing and keeps the old choice when declined', async () => {
      const { root, settingsApi, harness } = await setup({ total: 1, confirm: false });
      await vi.waitFor(() => expect(root.textContent).toContain('1 item'));

      radio(root, '7 days').click();
      await harness.fixture.whenStable();
      await vi.waitFor(() => {
        harness.fixture.detectChanges();
        expect(radio(root, '30 days').checked).toBe(true);
      });

      expect(settingsApi.update).not.toHaveBeenCalled();
    });

    it('does not ask when nothing would expire, or for a longer value', async () => {
      const empty = await setup({ total: 0 });
      radio(empty.root, '7 days').click();
      await empty.harness.fixture.whenStable();
      expect(empty.confirm).not.toHaveBeenCalled();
      expect(empty.settingsApi.update).toHaveBeenCalledWith({ trashRetentionDays: 7 });
    });

    it('saves a longer value at once without asking', async () => {
      const { root, settingsApi, confirm, harness } = await setup({ total: 3 });
      await vi.waitFor(() => expect(root.textContent).toContain('3 items'));

      radio(root, '90 days').click();
      await harness.fixture.whenStable();

      expect(confirm).not.toHaveBeenCalled();
      expect(settingsApi.update).toHaveBeenCalledWith({ trashRetentionDays: 90 });
    });
  });

  it('says how many items wait in Trash and opens the page', async () => {
    const { root, harness } = await setup({ total: 5 });
    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      expect(root.textContent).toContain('5 items');
    });

    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    root.querySelector<HTMLAnchorElement>('a[href="/trash"]')?.click();

    expect(navigate).toHaveBeenCalledWith('/trash');
  });

  it('says Nothing in Trash when it is empty', async () => {
    const { root, harness } = await setup({ total: 0 });
    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      expect(root.textContent).toContain('Nothing in Trash');
    });
  });

  it('turns folder colours off at once with the switch, and back on', async () => {
    const { root, settingsApi, harness } = await setup();
    const colours = switchNamed(root, 'Folder colours');
    expect(colours?.getAttribute('aria-checked')).toBe('true');

    colours?.click();
    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      expect(settingsApi.update).toHaveBeenCalledWith({ folderColours: false });
      expect(colours?.getAttribute('aria-checked')).toBe('false');
    });

    colours?.click();
    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      expect(settingsApi.update).toHaveBeenLastCalledWith({ folderColours: true });
    });
  });

  it('puts the switch back with an error toast when saving the colours fails', async () => {
    const { root, toasts, harness } = await setup({ failUpdate: true });
    const colours = switchNamed(root, 'Folder colours');

    colours?.click();
    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      expect(toasts.at(-1)?.kind).toBe(TOAST_KIND.Danger);
      expect(colours?.getAttribute('aria-checked')).toBe('true');
    });
  });

  it('opens the pinned items editor from the "Pinned at the top" row', async () => {
    const { root, open } = await setup();
    expect(root.textContent).toContain('Up to 7 folders and links');
    const edit = Array.from(root.querySelectorAll('button')).find(
      (b) => b.getAttribute('aria-haspopup') === 'dialog',
    );

    edit?.click();

    expect(open).toHaveBeenCalledTimes(1);
  });

  it('shows the Viewing and Saving choices of the account, then the footer note', async () => {
    const { root } = await setup();

    expect(radio(root, 'Cards').checked).toBe(true);
    expect(radio(root, 'New tab').checked).toBe(true);
    expect(switchNamed(root, 'Show folder counts').getAttribute('aria-checked')).toBe('true');
    expect(switchNamed(root, 'Warn about duplicates').getAttribute('aria-checked')).toBe('true');
    expect(switchNamed(root, 'Fetch titles and previews').getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(switchNamed(root, 'Keep the query part of links').getAttribute('aria-checked')).toBe(
      'false',
    );
    expect(root.textContent).toContain('Newest first');
    expect(root.textContent).toContain('Unsorted');
    expect(root.textContent).toContain('Each folder remembers its own choice after you change it');
    expect(root.textContent).toContain('Subfolders are always shown first in a folder');
    expect(root.textContent).not.toContain('·');
  });

  it('saves the default view and where links open at once', async () => {
    const { root, settingsApi, harness } = await setup();

    radio(root, 'List').click();
    await harness.fixture.whenStable();
    expect(settingsApi.update).toHaveBeenCalledWith({ defaultView: 'list' });

    radio(root, 'Same tab').click();
    await harness.fixture.whenStable();
    expect(settingsApi.update).toHaveBeenLastCalledWith({ openLinksIn: 'same-tab' });
    expect(radio(root, 'Same tab').checked).toBe(true);
  });

  it.each([
    ['Show folder counts', 'showFolderCounts', false],
    ['Warn about duplicates', 'warnDuplicates', false],
    ['Fetch titles and previews', 'fetchPreviews', false],
    ['Keep the query part of links', 'keepQuery', true],
  ] as const)('switches "%s" at once', async (name, key, value) => {
    const { root, settingsApi, harness } = await setup();
    const control = switchNamed(root, name);

    control.click();
    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      expect(settingsApi.update).toHaveBeenCalledWith({ [key]: value });
      expect(control.getAttribute('aria-checked')).toBe(String(value));
    });
  });

  it('puts a Library switch back with an error toast when saving fails', async () => {
    const { root, toasts, harness } = await setup({ failUpdate: true });
    const control = switchNamed(root, 'Fetch titles and previews');

    control.click();
    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      expect(toasts.at(-1)).toMatchObject({
        kind: TOAST_KIND.Danger,
        title: "Couldn't save the setting",
      });
      expect(control.getAttribute('aria-checked')).toBe('true');
    });
  });

  it('opens the sidebar tags from "Manage tags" on a wide screen', async () => {
    const { root } = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const manage = Array.from(root.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Manage tags'),
    );

    manage?.click();

    expect(navigate).toHaveBeenCalledWith('/links');
  });

  it('has no axe violations', async () => {
    const { root } = await setup({ total: 2 });

    expect(await axeViolations(root)).toEqual([]);
  });
});
