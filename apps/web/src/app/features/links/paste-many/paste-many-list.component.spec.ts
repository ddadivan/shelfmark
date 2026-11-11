import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import {
  linkLimitMessage,
  type CreateLinksBatchRequest,
  type CreateLinksBatchResponse,
  type LinkPreviewResponse,
  type LinkResponse,
} from '@shelfmark/contracts';
import { MOCK_ID, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { of, throwError, type Observable } from 'rxjs';
import { axeViolations } from '../../../../testing/axe';
import { APP_LANG } from '../../../core/i18n/models/app-lang.const';
import { AppTranslocoLoader } from '../../../core/i18n/app-transloco.loader';
import { translocoConfig } from '../../../core/i18n/transloco.config';
import { AddLinkDialogService } from '../add-link/add-link-dialog.service';
import { ADD_LINK_ACTION } from '../models/add-link-action.const';
import type { AddLinkData } from '../models/add-link-data.interface';
import { FOLDERS_API } from '../models/folders-api.const';
import type { LinksApi } from '../models/links-api.interface';
import { LINKS_API } from '../models/links-api.const';
import { TAGS_API } from '../models/tags-api.const';
import { MockFoldersApi } from '../mock/mock-folders.api';
import { MockTagsApi } from '../mock/mock-tags.api';

const SAVED_URL = 'https://youtube.com/watch?v=ng22-signal-forms';
const PASTE = [
  'youtube.com/watch?v=signals-deep-dive',
  'https://angular.dev/guide/forms/signals',
  'dev.to/ngrx/signalstore-testing',
  SAVED_URL,
  'remember to check the RFC',
].join('\n');

function preview(url: string): LinkPreviewResponse {
  const host = new URL(url).hostname;
  return {
    preview: {
      url,
      title: `Page on ${host}`,
      description: null,
      imageUrl: `https://${host}/og.png`,
      faviconUrl: null,
    },
    duplicate:
      url === SAVED_URL
        ? { id: MOCK_LINKS[0].id, title: 'Saved', folderId: null, folderName: null }
        : null,
    fetched: true,
  };
}

interface FakeApi extends Pick<LinksApi, 'preview' | 'createBatch'> {
  preview: ReturnType<typeof vi.fn<LinksApi['preview']>>;
  createBatch: ReturnType<typeof vi.fn<LinksApi['createBatch']>>;
}

function saved(request: CreateLinksBatchRequest): CreateLinksBatchResponse {
  return {
    links: request.items.map((item, index): LinkResponse => ({
      ...MOCK_LINKS[0],
      id: `new-${index}`,
      url: item.url,
      title: item.title ?? item.url,
      folderId: request.folderId ?? null,
      tags: request.tags ?? [],
    })),
    errors: [],
  };
}

function fakeApi(previewOf: (url: string) => Observable<LinkPreviewResponse>): FakeApi {
  return {
    preview: vi.fn<LinksApi['preview']>(previewOf),
    createBatch: vi.fn<LinksApi['createBatch']>((request) => of(saved(request))),
  };
}

async function setup(api: FakeApi, data: AddLinkData = { text: PASTE }) {
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: LINKS_API, useValue: api },
      { provide: FOLDERS_API, useClass: MockFoldersApi },
      { provide: TAGS_API, useClass: MockTagsApi },
    ],
  });
  await new Promise<void>((resolve) => {
    TestBed.inject(TranslocoService)
      .load(APP_LANG.En)
      .subscribe(() => {
        resolve();
      });
  });
  const result = TestBed.inject(AddLinkDialogService).open(data);
  await until(() => {
    expect(document.querySelector('.cdk-dialog-container')).not.toBeNull();
  });
  return { result };
}

function dialog(): HTMLElement {
  const element = document.querySelector<HTMLElement>('.cdk-dialog-container');
  if (!element) {
    throw new Error('no dialog open');
  }
  return element;
}

function heading(): string {
  return dialog().querySelector('h2')?.textContent?.trim() ?? '';
}

function rows(): HTMLElement[] {
  return [...dialog().querySelectorAll<HTMLElement>('.paste-many__row')];
}

function checkbox(label: string): HTMLInputElement {
  const found = [...dialog().querySelectorAll('ui-checkbox')].find(
    (box) => box.querySelector('.ui-checkbox__text')?.textContent?.trim() === label,
  );
  const input = found?.querySelector<HTMLInputElement>('input');
  if (!input) {
    throw new Error(`no checkbox ${label}`);
  }
  return input;
}

function button(label: string): HTMLButtonElement {
  const found = [...dialog().querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label,
  );
  if (!found) {
    throw new Error(`no button ${label}`);
  }
  return found;
}

function click(input: HTMLInputElement): void {
  input.click();
  TestBed.tick();
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

/** A paste event with `text`, the way a browser fires it on the focused field. */
function pasteInto(target: HTMLElement, text: string): Event {
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: { getData: (type: string) => (type === 'text/plain' ? text : '') },
  });
  target.dispatchEvent(event);
  TestBed.tick();
  return event;
}

afterEach(() => {
  document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
    el.replaceChildren();
  });
});

describe('PasteManyListComponent', () => {
  it('lists the pasted links checked, the saved one unchecked with a badge, and the skipped line', async () => {
    const api = fakeApi((url) => of(preview(url)));
    await setup(api);

    await until(() => {
      expect(heading()).toBe('Add 3 links');
    });
    expect(dialog().textContent).toContain('Found 4 links in what you pasted.');
    expect(dialog().textContent).toContain('1 is already on your shelf.');
    expect(dialog().textContent).toContain('3 of 4 selected');
    expect(rows()).toHaveLength(5);
    expect(checkbox('Page on angular.dev').checked).toBe(true);
    const savedRow = rows()[3];
    expect(savedRow.querySelector('ui-badge')?.textContent?.trim()).toBe('Already saved');
    expect(savedRow.querySelector<HTMLInputElement>('input')?.checked).toBe(false);
    expect(rows()[4].textContent).toContain('“remember to check the RFC”');
    expect(rows()[4].textContent).toContain('Not a link, skipped');
    expect(button('Save 3 links')).toBeTruthy();
    expect(dialog().textContent).toContain('Titles and previews keep loading after you save.');
  });

  it('loads the previews through the preview endpoint, one per link', async () => {
    const api = fakeApi((url) => of(preview(url)));
    await setup(api);

    await until(() => {
      expect(api.preview).toHaveBeenCalledTimes(4);
    });
    expect(api.preview).toHaveBeenCalledWith('https://youtube.com/watch?v=signals-deep-dive');
    expect(api.preview).toHaveBeenCalledWith('https://dev.to/ngrx/signalstore-testing');
  });

  it('shows the address while a preview loads and keeps it when the preview fails', async () => {
    const api = fakeApi((url) =>
      url.includes('dev.to') ? throwError(() => new Error('down')) : of(preview(url)),
    );
    await setup(api);

    await until(() => {
      expect(checkbox('dev.to/ngrx/signalstore-testing')).toBeTruthy();
      expect(checkbox('Page on angular.dev')).toBeTruthy();
    });
  });

  it('puts focus on "Select all" when the list opens', async () => {
    await setup(fakeApi((url) => of(preview(url))));

    await until(() => {
      expect(document.activeElement).toBe(checkbox('Select all'));
    });
  });

  it('turns the dialog into the list when several links are pasted into the Link field', async () => {
    await setup(
      fakeApi((url) => of(preview(url))),
      {},
    );
    const field = dialog().querySelector<HTMLInputElement>('input[type="url"]');
    if (!field) {
      throw new Error('no link field');
    }

    const event = pasteInto(field, 'see https://a.example/1 and https://b.example/2');

    expect(event.defaultPrevented).toBe(true);
    await until(() => {
      expect(heading()).toBe('Add 2 links');
    });
  });

  it('leaves a single pasted link to the Link field', async () => {
    await setup(
      fakeApi((url) => of(preview(url))),
      {},
    );
    const field = dialog().querySelector<HTMLInputElement>('input[type="url"]');
    if (!field) {
      throw new Error('no link field');
    }

    const event = pasteInto(field, 'https://a.example/1');

    expect(event.defaultPrevented).toBe(false);
    expect(heading()).toBe('Add link');
  });

  it('fills the address when the handed-over text holds one link', async () => {
    await setup(
      fakeApi((url) => of(preview(url))),
      { text: 'look: example.org/post' },
    );

    await until(() => {
      expect(dialog().querySelector<HTMLInputElement>('input[type="url"]')?.value).toBe(
        'https://example.org/post',
      );
    });
    expect(heading()).toBe('Add link');
  });

  it('unchecks and checks rows; "Select all" follows', async () => {
    await setup(fakeApi((url) => of(preview(url))));
    await until(() => {
      expect(heading()).toBe('Add 3 links');
    });

    click(checkbox('Page on angular.dev'));
    expect(heading()).toBe('Add 2 links');
    expect(checkbox('Select all').indeterminate).toBe(true);

    click(checkbox('Select all'));
    expect(heading()).toBe('Add 4 links');
    expect(dialog().textContent).toContain('4 of 4 selected');

    click(checkbox('Select all'));
    expect(heading()).toBe('Add links');
    expect(button('Save links').disabled).toBe(true);
  });

  it('removes a row and moves focus to the next one', async () => {
    await setup(fakeApi((url) => of(preview(url))));
    await until(() => {
      expect(heading()).toBe('Add 3 links');
    });

    button('Remove Page on angular.dev').click();

    await until(() => {
      expect(rows()).toHaveLength(4);
      expect(document.activeElement).toBe(checkbox('Page on dev.to'));
    });
    expect(heading()).toBe('Add 2 links');
    expect(dialog().textContent).not.toContain('Page on angular.dev');
  });

  it('saves the checked links in one batch with folder, tags, preview hints and a key each', async () => {
    const api = fakeApi((url) => of(preview(url)));
    const { result } = await setup(api, {
      text: PASTE,
      folderId: MOCK_ID.FolderAngular,
    });
    await until(() => {
      expect(heading()).toBe('Add 3 links');
    });

    button('Save 3 links').click();

    const outcome = await result;
    expect(api.createBatch).toHaveBeenCalledTimes(1);
    const request = api.createBatch.mock.calls[0][0];
    expect(request.folderId).toBe(MOCK_ID.FolderAngular);
    expect(request.items.map((item) => item.url)).toEqual([
      'https://youtube.com/watch?v=signals-deep-dive',
      'https://angular.dev/guide/forms/signals',
      'https://dev.to/ngrx/signalstore-testing',
    ]);
    expect(request.items[1]).toMatchObject({
      title: 'Page on angular.dev',
      imageUrl: 'https://angular.dev/og.png',
    });
    expect(new Set(request.items.map((item) => item.idempotencyKey)).size).toBe(3);
    expect(outcome).toMatchObject({
      action: ADD_LINK_ACTION.SavedMany,
      folderId: MOCK_ID.FolderAngular,
    });
    expect(outcome?.action === ADD_LINK_ACTION.SavedMany && outcome.links).toHaveLength(3);
  });

  it('sends a link without a loaded preview with its URL only', async () => {
    const api = fakeApi((url) =>
      url.includes('dev.to') ? throwError(() => new Error('down')) : of(preview(url)),
    );
    const { result } = await setup(api);
    await until(() => {
      expect(checkbox('dev.to/ngrx/signalstore-testing')).toBeTruthy();
      expect(heading()).toBe('Add 3 links');
    });

    button('Save 3 links').click();
    await result;

    const item = api.createBatch.mock.calls[0][0].items[2];
    expect(item).toEqual({
      url: 'https://dev.to/ngrx/signalstore-testing',
      idempotencyKey: expect.any(String),
    });
  });

  it('keeps the list open on a failure and retries with the same keys', async () => {
    const api = fakeApi((url) => of(preview(url)));
    api.createBatch.mockReturnValueOnce(throwError(() => new Error('offline')));
    const { result } = await setup(api);
    await until(() => {
      expect(heading()).toBe('Add 3 links');
    });

    button('Save 3 links').click();
    await until(() => {
      expect(dialog().textContent).toContain("Couldn't save the link. Try again.");
    });
    button('Save 3 links').click();
    await result;

    const [first, second] = api.createBatch.mock.calls.map(([request]) =>
      request.items.map((item) => item.idempotencyKey),
    );
    expect(second).toEqual(first);
  });

  it('says how many links still fit when the batch is over the limit', async () => {
    const api = fakeApi((url) => of(preview(url)));
    api.createBatch.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              statusCode: 409,
              error: 'Conflict',
              message: linkLimitMessage(2),
              requestId: 'r',
            },
          }),
      ),
    );
    await setup(api);
    await until(() => {
      expect(heading()).toBe('Add 3 links');
    });

    button('Save 3 links').click();

    await until(() => {
      expect(dialog().textContent).toContain(
        'Only 2 more links fit your shelf. Uncheck some and try again.',
      );
    });
  });

  it('notes the links past the limit and points to Import', async () => {
    const text = Array.from({ length: 105 }, (_, index) => `https://example.org/${index}`).join(
      '\n',
    );
    const api = fakeApi((url) => of(preview(url)));
    await setup(api, { text });

    await until(() => {
      expect(heading()).toBe('Add 100 links');
    });
    expect(dialog().textContent).toContain(
      '5 more links were left out: up to 100 links at a time. Bigger lists go to Import as text.',
    );
  });

  it('Cancel closes without saving', async () => {
    const api = fakeApi((url) => of(preview(url)));
    const { result } = await setup(api);

    button('Cancel').click();

    expect(await result).toBeUndefined();
    expect(api.createBatch).not.toHaveBeenCalled();
  });

  it('has no axe violations', async () => {
    await setup(fakeApi((url) => of(preview(url))));
    await until(() => {
      expect(heading()).toBe('Add 3 links');
    });

    expect(await axeViolations(dialog())).toEqual([]);
  });
});
