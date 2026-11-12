import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import {
  LIBRARY_SETTINGS_DEFAULT,
  LINK_ERROR_MESSAGE,
  type LibrarySettings,
  type UpdateUserSettingsRequest,
  type UserSettingsResponse,
  LINK_KIND,
  type LinkPreviewResponse,
  type LinkResponse,
} from '@shelfmark/contracts';
import {
  MOCK_APPEARANCE_DEFAULTS,
  MOCK_ID,
  MOCK_LINK_PREVIEW_DUPLICATE,
  MOCK_LINKS,
} from '@shelfmark/contracts/testing';
import axe from 'axe-core';
import { delay, of, tap, throwError, type Observable } from 'rxjs';
import { APP_LANG } from '../../../core/i18n/models/app-lang.const';
import { LANGUAGE_STORAGE_KEY } from '../../../core/i18n/models/language-storage-key.const';
import { AppTranslocoLoader } from '../../../core/i18n/app-transloco.loader';
import { translocoConfig } from '../../../core/i18n/transloco.config';
import { ADD_LINK_ACTION } from '../models/add-link-action.const';
import type { AddLinkResult } from '../models/add-link-result.type';
import { FOLDERS_API } from '../models/folders-api.const';
import type { LinksApi } from '../models/links-api.interface';
import { LINKS_API } from '../models/links-api.const';
import { TAGS_API } from '../models/tags-api.const';
import { MockFoldersApi } from '../mock/mock-folders.api';
import { MockTagsApi } from '../mock/mock-tags.api';
import { AddLinkDialogService } from './add-link-dialog.service';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { USER_SETTINGS_API } from '../../settings/models/user-settings-api.const';

const PLAIN: LinkPreviewResponse = {
  preview: {
    kind: LINK_KIND.Article,
    url: 'https://example.org/post',
    title: 'A fine post',
    description: 'About a thing.',
    imageUrl: null,
    faviconUrl: null,
  },
  duplicate: null,
  fetched: true,
};

const EDITED: LinkResponse = {
  ...MOCK_LINKS[0],
  url: 'https://example.org/saved',
  title: 'Saved title',
  note: 'A note',
  folderId: MOCK_ID.FolderAngular,
  tags: ['docs'],
  createdAt: '2026-10-17T12:00:00Z',
  lastOpenedAt: '2026-11-06T12:00:00Z',
};

interface FakeApi extends Pick<LinksApi, 'preview' | 'create' | 'update'> {
  preview: ReturnType<typeof vi.fn<LinksApi['preview']>>;
  create: ReturnType<typeof vi.fn<LinksApi['create']>>;
  update: ReturnType<typeof vi.fn<LinksApi['update']>>;
}

function fakeApi(preview: () => Observable<LinkPreviewResponse>): FakeApi {
  return {
    preview: vi.fn<LinksApi['preview']>(preview),
    create: vi.fn<LinksApi['create']>((request) =>
      of<LinkResponse>({ ...MOCK_LINKS[0], url: request.url, title: request.title ?? request.url }),
    ),
    update: vi.fn<LinksApi['update']>((id, request) =>
      of<LinkResponse>({ ...EDITED, id, ...request }),
    ),
  };
}

async function setup(
  api: FakeApi,
  data?: Parameters<AddLinkDialogService['open']>[0],
  library?: Partial<LibrarySettings>,
  update?: (request: UpdateUserSettingsRequest) => Observable<UserSettingsResponse>,
) {
  const account: UserSettingsResponse = {
    trashRetentionDays: 30,
    folderColours: true,
    pauseHistory: false,
    ...MOCK_APPEARANCE_DEFAULTS,
    ...LIBRARY_SETTINGS_DEFAULT,
    ...library,
  };
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: LINKS_API, useValue: api },
      { provide: FOLDERS_API, useClass: MockFoldersApi },
      { provide: TAGS_API, useClass: MockTagsApi },
      ...(library
        ? [{ provide: USER_SETTINGS_API, useValue: { get: () => of(account), update } }]
        : []),
    ],
  });
  if (library) {
    await TestBed.inject(UserSettingsStore).load();
  }
  await new Promise<void>((resolve) => {
    TestBed.inject(TranslocoService)
      .load(APP_LANG.En)
      .subscribe(() => {
        resolve();
      });
  });
  const result = TestBed.inject(AddLinkDialogService).open(data);
  await vi.waitFor(() => {
    TestBed.tick();
    expect(root()).not.toBeNull();
  });
  return { result };
}

/** The account the "Check spelling" tests answer with after a save. */
const ACCOUNT_FOR_SPELLING: UserSettingsResponse = {
  trashRetentionDays: 30,
  folderColours: true,
  pauseHistory: false,
  ...MOCK_APPEARANCE_DEFAULTS,
  ...LIBRARY_SETTINGS_DEFAULT,
};

function checkbox(label: string): HTMLInputElement {
  const found = [...dialog().querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].find(
    (box) => box.closest('label')?.textContent?.trim() === label,
  );
  if (!found) {
    throw new Error(`no checkbox ${label}`);
  }
  return found;
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

function input(label: string): HTMLInputElement | HTMLTextAreaElement {
  const field = [...dialog().querySelectorAll('label')].find(
    (l) => l.textContent?.trim() === label,
  );
  const control = field && dialog().querySelector<HTMLInputElement>(`#${field.htmlFor}`);
  if (!control) {
    throw new Error(`no field ${label}`);
  }
  return control;
}

async function type(label: string, value: string): Promise<void> {
  const control = input(label);
  control.value = value;
  control.dispatchEvent(new Event('input'));
  control.dispatchEvent(new Event('blur'));
  TestBed.tick();
}

function button(label: string): HTMLButtonElement {
  const found = [...dialog().querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === label,
  );
  if (!found) {
    throw new Error(`no button ${label}`);
  }
  return found;
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

afterEach(() => {
  document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
    el.replaceChildren();
  });
});

describe('AddLinkDialogComponent', () => {
  it('has no favorites checkbox when adding', async () => {
    await setup(fakeApi(() => of(PLAIN)));

    expect(dialog().textContent).not.toContain('Add to favorites');
    // The only checkbox when adding is "Check spelling" under the note (#315).
    expect(dialog().querySelectorAll('ui-checkbox')).toHaveLength(1);
  });

  it('starts empty with the hint and no preview', async () => {
    const api = fakeApi(() => of(PLAIN));
    await setup(api);

    expect(dialog().textContent).toContain('Add link');
    expect(dialog().textContent).toContain('Paste a link');
    expect(dialog().querySelector('.add-link__preview')).toBeNull();
    expect(api.preview).not.toHaveBeenCalled();
  });

  it('puts focus on the link field when it opens', async () => {
    await setup(fakeApi(() => of(PLAIN)));

    await until(() => {
      expect(document.activeElement).toBe(input('Link'));
    });
  });

  describe('Add several links (#315)', () => {
    function textArea(): HTMLTextAreaElement {
      return input('Paste links, one per line or inside any text') as HTMLTextAreaElement;
    }

    it('offers the several-links mode under the address, and not when editing', async () => {
      await setup(fakeApi(() => of(PLAIN)));
      expect(dialog().textContent).toContain('Have several links? Paste them all at once');
      expect(button('Add several links')).toBeDefined();
    });

    it('switches to a text area with focus in it, and back to one link', async () => {
      await setup(fakeApi(() => of(PLAIN)));
      button('Add several links').click();
      await until(() => {
        expect(document.activeElement).toBe(textArea());
      });
      expect(dialog().textContent).toContain('Up to 100 links at a time.');
      expect(dialog().querySelector('ui-tag-input')).toBeNull();

      button('One link').click();
      await until(() => {
        expect(document.activeElement).toBe(input('Link'));
      });
    });

    it('says when the text holds no links and stays in the text area', async () => {
      await setup(fakeApi(() => of(PLAIN)));
      button('Add several links').click();
      await until(() => {
        expect(textArea()).toBeDefined();
      });
      await type('Paste links, one per line or inside any text', 'nothing to see here');
      button('Find links').click();
      await until(() => {
        expect(dialog().textContent).toContain('No links found in this text');
      });
      expect(dialog().querySelector('app-paste-many-list')).toBeNull();
    });

    it('opens the paste-many list for the links found in the text', async () => {
      await setup(fakeApi(() => of(PLAIN)));
      button('Add several links').click();
      await until(() => {
        expect(textArea()).toBeDefined();
      });
      await type(
        'Paste links, one per line or inside any text',
        'Read https://a.example.com/one and https://b.example.com/two\nhttps://c.example.com/three',
      );
      button('Find links').click();
      await until(() => {
        expect(dialog().querySelector('app-paste-many-list')).not.toBeNull();
      });
      expect(dialog().querySelectorAll('.paste-many__row')).toHaveLength(3);
    });

    it('goes straight to the list when links are pasted into the text area', async () => {
      await setup(fakeApi(() => of(PLAIN)));
      button('Add several links').click();
      await until(() => {
        expect(textArea()).toBeDefined();
      });
      const paste = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(paste, 'clipboardData', {
        value: { getData: () => 'https://a.example.com/1\nhttps://b.example.com/2' },
      });
      textArea().dispatchEvent(paste);
      await until(() => {
        expect(dialog().querySelectorAll('.paste-many__row')).toHaveLength(2);
      });
      expect(paste.defaultPrevented).toBe(true);
    });
  });

  it('shows the required message when saving an empty form and does not save', async () => {
    const api = fakeApi(() => of(PLAIN));
    await setup(api);

    button('Save link').click();
    await until(() => {
      expect(dialog().textContent).toContain('Enter a link');
    });
    expect(api.create).not.toHaveBeenCalled();
  });

  it('rejects a non-http URL: message, no preview request', async () => {
    const api = fakeApi(() => of(PLAIN));
    await setup(api);

    await type('Link', 'javascript:alert(1)');
    await until(() => {
      expect(dialog().textContent).toContain('starts with http:// or https://');
    });
    expect(input('Link').getAttribute('aria-invalid')).toBe('true');
    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(api.preview).not.toHaveBeenCalled();
  });

  it('shows a loading state, then autofills the title from the preview (text only)', async () => {
    const api = fakeApi(() => of(PLAIN).pipe(delay(50)));
    await setup(api);

    await type('Link', 'https://example.org/post');
    await until(() => {
      expect(dialog().querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(dialog().textContent).toContain('Loading preview');
    });
    await until(() => {
      expect(input('Title').value).toBe('A fine post');
    });
    expect(dialog().textContent).toContain('About a thing.');
    expect(dialog().textContent).toContain('example.org');
    expect(dialog().querySelector('img')).toBeNull();
    expect(dialog().querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('keeps a title the user has typed', async () => {
    const api = fakeApi(() => of(PLAIN).pipe(delay(100)));
    await setup(api);

    await type('Link', 'https://example.org/post');
    await type('Title', 'My own title');
    await until(() => {
      expect(dialog().textContent).toContain('About a thing.');
    });
    expect(input('Title').value).toBe('My own title');
  });

  it('warns about a duplicate and offers to open the saved link', async () => {
    const api = fakeApi(() => of(MOCK_LINK_PREVIEW_DUPLICATE));
    const { result } = await setup(api);

    await type('Link', MOCK_LINK_PREVIEW_DUPLICATE.preview.url);
    await until(() => {
      expect(dialog().querySelector('ui-notice')?.textContent).toContain(
        'You already saved this link in Angular',
      );
    });
    expect(() => button('Save link')).toThrow();
    button('Save anyway');

    button('Open saved').click();
    const outcome = await result;
    expect(outcome).toEqual({
      action: ADD_LINK_ACTION.OpenExisting,
      existing: MOCK_LINK_PREVIEW_DUPLICATE.duplicate,
    });
    expect(api.create).not.toHaveBeenCalled();
  });

  it('says "Unsorted" for a duplicate without a folder', async () => {
    const api = fakeApi(() =>
      of({
        ...MOCK_LINK_PREVIEW_DUPLICATE,
        duplicate: {
          id: MOCK_ID.LinkPasta,
          title: 'x',
          folderId: null,
          folderName: null,
        },
      }),
    );
    await setup(api);

    await type('Link', 'https://example.org/post');
    await until(() => {
      expect(dialog().querySelector('ui-notice')?.textContent).toContain('in Unsorted');
    });
  });

  it('saves a duplicate anyway', async () => {
    const api = fakeApi(() => of(MOCK_LINK_PREVIEW_DUPLICATE));
    const { result } = await setup(api);

    await type('Link', MOCK_LINK_PREVIEW_DUPLICATE.preview.url);
    await until(() => {
      expect(() => button('Save anyway')).not.toThrow();
    });
    button('Save anyway').click();

    const outcome = await result;
    expect(outcome?.action).toBe(ADD_LINK_ACTION.Saved);
    expect(api.create).toHaveBeenCalledTimes(1);
  });

  it('keeps the link saveable when the preview fails, with the address as title', async () => {
    const api = fakeApi(() => throwError(() => new Error('boom')));
    const { result } = await setup(api);

    await type('Link', 'https://intranet.example/doc/42');
    await until(() => {
      expect(dialog().querySelector('ui-notice')?.getAttribute('role')).toBe('alert');
      expect(input('Title').value).toBe('intranet.example/doc/42');
    });
    expect(dialog().textContent).toContain("Couldn't load a preview");

    button('Save link').click();
    const outcome = await result;
    expect(api.create).toHaveBeenCalledWith({
      url: 'https://intranet.example/doc/42',
      title: 'intranet.example/doc/42',
      idempotencyKey: expect.any(String),
    });
    expect(outcome?.action).toBe(ADD_LINK_ACTION.Saved);
  });

  it('sends folder, tags and note with the link and resolves with the saved link', async () => {
    const api = fakeApi(() => of(PLAIN));
    const { result } = await setup(api, { folderId: MOCK_ID.FolderAngular });

    await type('Link', ' https://example.org/post ');
    await type('Note', 'Read on the weekend');
    const tags = dialog().querySelector<HTMLInputElement>('ui-tag-input input');
    if (!tags) {
      throw new Error('no tag input');
    }
    tags.value = 'docs';
    tags.dispatchEvent(new Event('input'));
    tags.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await until(() => {
      expect(input('Title').value).toBe('A fine post');
    });

    button('Save link').click();
    const outcome: AddLinkResult | undefined = await result;
    expect(api.create).toHaveBeenCalledWith({
      url: 'https://example.org/post',
      title: 'A fine post',
      note: 'Read on the weekend',
      folderId: MOCK_ID.FolderAngular,
      tags: ['docs'],
      kind: LINK_KIND.Article,
      idempotencyKey: expect.any(String),
    });
    expect(outcome?.action).toBe(ADD_LINK_ACTION.Saved);
  });

  it('saves with Ctrl + Enter from a field and shows the shortcut in the footer', async () => {
    const api = fakeApi(() => of(PLAIN));
    const { result } = await setup(api);
    expect(dialog().querySelector('.add-link__shortcut')?.textContent).toContain('to save');

    await type('Link', 'https://example.org/post');
    await until(() => {
      expect(input('Title').value).toBe('A fine post');
    });
    input('Note').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }),
    );

    const outcome: AddLinkResult | undefined = await result;
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(outcome?.action).toBe(ADD_LINK_ACTION.Saved);
  });

  describe('tags', () => {
    function addTag(text: string): void {
      const tags = dialog().querySelector<HTMLInputElement>('ui-tag-input input');
      if (!tags) {
        throw new Error('no tag input');
      }
      tags.value = text;
      tags.dispatchEvent(new Event('input'));
      tags.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }

    it('turns spaces in a new tag into hyphens in the chip and in the saved link', async () => {
      const api = fakeApi(() => of(PLAIN));
      const { result } = await setup(api);

      await type('Link', 'https://example.org/post');
      addTag('winter  sale');
      addTag('Winter-Sale');
      await until(() => {
        expect(dialog().querySelector('ui-tag-input')?.textContent).toContain('winter-sale');
        expect(input('Title').value).toBe('A fine post');
      });
      button('Save link').click();
      await result;

      expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ tags: ['winter-sale'] }));
    });

    it('suggests the existing tags of the store with their link counts', async () => {
      const api = fakeApi(() => of(PLAIN));
      await setup(api);
      const tags = dialog().querySelector<HTMLInputElement>('ui-tag-input input');
      if (!tags) {
        throw new Error('no tag input');
      }

      tags.focus();
      tags.value = 'doc';
      tags.dispatchEvent(new Event('input'));

      await until(() => {
        const options = [...document.querySelectorAll('[role="option"]')].map(
          (option) => option.textContent ?? '',
        );
        expect(options.some((text) => /docs.*\d+ links?/.test(text))).toBe(true);
      });
    });

    it('prefills the tags of an edited link in their stored spelling', async () => {
      const api = fakeApi(() => of(PLAIN));
      await setup(api, { link: { ...EDITED, tags: ['winter-sale'] } });

      expect(dialog().querySelector('ui-tag-input')?.textContent).toContain('winter-sale');
    });
  });

  it('shows an error and stays open when saving fails', async () => {
    const api = fakeApi(() => of(PLAIN));
    api.create.mockReturnValue(throwError(() => new Error('boom')));
    await setup(api);

    await type('Link', 'https://example.org/post');
    button('Save link').click();
    await until(() => {
      expect(dialog().textContent).toContain("Couldn't save the link");
    });
    expect(button('Save link').disabled).toBe(false);
  });

  describe('idempotency key', () => {
    function keyOf(api: FakeApi, call: number): string | undefined {
      return api.create.mock.calls[call]?.[0].idempotencyKey;
    }

    async function save(): Promise<void> {
      button('Save link').click();
      await until(() => {
        expect(button('Save link').disabled).toBe(false);
      });
    }

    it('sends the same key on every attempt with the same payload', async () => {
      const api = fakeApi(() => of(PLAIN));
      api.create.mockReturnValue(throwError(() => new Error('boom')));
      await setup(api);

      await type('Link', 'https://example.org/post');
      await until(() => {
        expect(input('Title').value).toBe('A fine post');
      });
      await save();
      await save();

      expect(api.create).toHaveBeenCalledTimes(2);
      expect(keyOf(api, 0)).toMatch(/^[0-9a-f-]{36}$/);
      expect(keyOf(api, 1)).toBe(keyOf(api, 0));
    });

    it('sends a new key once the payload changed since the last attempt', async () => {
      const api = fakeApi(() => of(PLAIN));
      api.create.mockReturnValue(throwError(() => new Error('boom')));
      await setup(api);

      await type('Link', 'https://example.org/post');
      await until(() => {
        expect(input('Title').value).toBe('A fine post');
      });
      await save();
      await type('Note', 'now with a note');
      await save();
      await save();

      expect(keyOf(api, 1)).not.toBe(keyOf(api, 0));
      expect(keyOf(api, 2)).toBe(keyOf(api, 1));
    });

    it('keeps the key when a late preview autofills the title and the hints', async () => {
      const api = fakeApi(() =>
        of({
          ...PLAIN,
          preview: { ...PLAIN.preview, faviconUrl: 'https://example.org/f.ico' },
        }).pipe(delay(300)),
      );
      api.create.mockReturnValue(throwError(() => new Error('boom')));
      await setup(api);

      await type('Link', 'https://example.org/post');
      await save();
      await until(() => {
        expect(input('Title').value).toBe('A fine post');
      });
      await save();

      expect(api.create.mock.calls[0]?.[0].faviconUrl).toBeUndefined();
      expect(api.create.mock.calls[1]?.[0].faviconUrl).toBe('https://example.org/f.ico');
      expect(keyOf(api, 1)).toBe(keyOf(api, 0));
    });

    it.each(['Title', 'Tags'])('sends a new key after the user edited %s', async (field) => {
      const api = fakeApi(() => of(PLAIN));
      api.create.mockReturnValue(throwError(() => new Error('boom')));
      await setup(api);

      await type('Link', 'https://example.org/post');
      await until(() => {
        expect(input('Title').value).toBe('A fine post');
      });
      await save();
      if (field === 'Title') {
        await type('Title', 'My own title');
      } else {
        const tags = dialog().querySelector<HTMLInputElement>('ui-tag-input input');
        if (!tags) {
          throw new Error('no tag input');
        }
        tags.value = 'docs';
        tags.dispatchEvent(new Event('input'));
        tags.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }
      await save();

      expect(keyOf(api, 1)).not.toBe(keyOf(api, 0));
    });

    it('starts every new dialog with a new key', async () => {
      const api = fakeApi(() => of(PLAIN));
      const { result } = await setup(api);
      await type('Link', 'https://example.org/post');
      await until(() => {
        expect(input('Title').value).toBe('A fine post');
      });
      button('Save link').click();
      await result;

      const next = TestBed.inject(AddLinkDialogService).open();
      await until(() => {
        expect(root()).not.toBeNull();
      });
      await type('Link', 'https://example.org/post');
      await until(() => {
        expect(input('Title').value).toBe('A fine post');
      });
      button('Save link').click();
      await next;

      expect(api.create).toHaveBeenCalledTimes(2);
      expect(keyOf(api, 1)).not.toBe(keyOf(api, 0));
    });

    it('sends no key when editing', async () => {
      const api = fakeApi(() => of(PLAIN));
      const { result } = await setup(api, { link: EDITED });

      await type('Title', 'Changed');
      button('Save changes').click();
      await result;

      expect(api.create).not.toHaveBeenCalled();
      expect(api.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('preview that could not be fetched', () => {
    const UNFETCHED: LinkPreviewResponse = {
      preview: { ...PLAIN.preview, title: 'https://example.org/post' },
      duplicate: MOCK_LINK_PREVIEW_DUPLICATE.duplicate,
      fetched: false,
    };

    it('shows "no preview", keeps the duplicate notice and does not fill the title', async () => {
      const api = fakeApi(() => of(UNFETCHED));
      await setup(api);

      await type('Link', 'https://example.org/post');
      await until(() => {
        expect(dialog().textContent).toContain('No preview is available');
      });

      expect(dialog().textContent).toContain('You already saved this link');
      expect(dialog().querySelector('.add-link__preview')).toBeNull();
      expect(input('Title').value).toBe('');
    });

    it('omits the title and the image hints on create', async () => {
      const api = fakeApi(() =>
        of({
          ...UNFETCHED,
          preview: { ...UNFETCHED.preview, faviconUrl: 'https://example.org/f.ico' },
        }),
      );
      const { result } = await setup(api);

      await type('Link', 'https://example.org/post');
      await until(() => {
        expect(dialog().textContent).toContain('No preview is available');
      });
      button('Save anyway').click();
      await result;

      expect(api.create).toHaveBeenCalledWith({
        url: 'https://example.org/post',
        idempotencyKey: expect.any(String),
      });
    });

    it('sends favicon and image only when the page was fetched', async () => {
      const api = fakeApi(() =>
        of({
          ...PLAIN,
          preview: {
            ...PLAIN.preview,
            faviconUrl: 'https://example.org/f.ico',
            imageUrl: 'https://example.org/i.png',
          },
        }),
      );
      const { result } = await setup(api);

      await type('Link', 'https://example.org/post');
      await until(() => {
        expect(input('Title').value).toBe('A fine post');
      });
      button('Save link').click();
      await result;

      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({
          faviconUrl: 'https://example.org/f.ico',
          imageUrl: 'https://example.org/i.png',
        }),
      );
    });
  });

  describe('save errors', () => {
    function failing(status: number, message: string): HttpErrorResponse {
      return new HttpErrorResponse({
        status,
        error: { statusCode: status, error: 'Error', message, requestId: 'r1' },
      });
    }

    it.each([
      [409, LINK_ERROR_MESSAGE.LimitReached, 'reached the limit of 10000 saved links'],
      [429, 'Too Many Requests', 'Too many requests'],
      [400, 'Bad Request', 'some details are invalid'],
    ])('explains a %i', async (status, message, copy) => {
      const api = fakeApi(() => of(PLAIN));
      api.create.mockReturnValue(throwError(() => failing(status, message)));
      await setup(api);

      await type('Link', 'https://example.org/post');
      button('Save link').click();

      await until(() => {
        expect(dialog().textContent).toContain(copy);
      });
    });
  });

  it('closes without a result on Cancel', async () => {
    const api = fakeApi(() => of(PLAIN));
    const { result } = await setup(api);

    button('Cancel').click();
    expect(await result).toBeUndefined();
  });

  it('does not let a slow earlier preview overwrite the title of a later URL', async () => {
    const slow: LinkPreviewResponse = {
      ...PLAIN,
      preview: { ...PLAIN.preview, title: 'Slow A' },
    };
    const fast: LinkPreviewResponse = {
      ...PLAIN,
      preview: { ...PLAIN.preview, title: 'Fast B' },
    };
    const api = fakeApi(() => of(PLAIN));
    api.preview.mockImplementation((url) =>
      url.endsWith('/a') ? of(slow).pipe(delay(1200)) : of(fast).pipe(delay(20)),
    );
    await setup(api);

    await type('Link', 'https://example.org/a');
    await until(() => {
      expect(api.preview).toHaveBeenCalledTimes(1);
    });
    await type('Link', 'https://example.org/b');
    await until(() => {
      expect(input('Title').value).toBe('Fast B');
    });
    await new Promise((resolve) => setTimeout(resolve, 1400));
    TestBed.tick();
    expect(input('Title').value).toBe('Fast B');
  });

  it('clears an autofilled title when the URL is no longer valid, but keeps a typed one', async () => {
    const api = fakeApi(() => of(PLAIN));
    await setup(api);

    await type('Link', 'https://example.org/post');
    await until(() => {
      expect(input('Title').value).toBe('A fine post');
    });
    await type('Link', 'https://');
    await until(() => {
      expect(input('Title').value).toBe('');
    });

    await type('Link', 'https://example.org/post');
    await until(() => {
      expect(input('Title').value).toBe('A fine post');
    });
    await type('Title', 'Mine');
    await type('Link', '');
    TestBed.tick();
    expect(input('Title').value).toBe('Mine');
  });

  it('moves focus to the first invalid field when saving fails validation', async () => {
    const api = fakeApi(() => of(PLAIN));
    await setup(api);

    button('Save link').click();
    await until(() => {
      expect(document.activeElement).toBe(input('Link'));
    });
  });

  it('announces the preview through the always-present status region', async () => {
    const api = fakeApi(() => of(MOCK_LINK_PREVIEW_DUPLICATE).pipe(delay(30)));
    await setup(api);
    const region = dialog().querySelector('.add-link__sr[role="status"]');
    expect(region).not.toBeNull();

    await type('Link', MOCK_LINK_PREVIEW_DUPLICATE.preview.url);
    await until(() => {
      expect(region?.textContent).toContain('Loading preview');
    });
    await until(() => {
      expect(region?.textContent).toContain('Preview loaded: Angular overview');
      expect(region?.textContent).toContain('You already saved this link in Angular');
    });
  });

  it('disables Cancel while saving and still resolves the caller when dismissed mid-save', async () => {
    const api = fakeApi(() => of(PLAIN));
    api.create.mockImplementation((request) =>
      of<LinkResponse>({ ...MOCK_LINKS[0], url: request.url }).pipe(delay(200)),
    );
    const { result } = await setup(api);

    await type('Link', 'https://example.org/post');
    button('Save link').click();
    await until(() => {
      expect(button('Cancel').disabled).toBe(true);
    });
    // Dismiss through the header close button while the request is in flight.
    dialog().querySelector<HTMLButtonElement>('button[aria-label="Close"]')?.click();

    const outcome = await result;
    expect(outcome?.action).toBe(ADD_LINK_ACTION.Saved);
  });

  describe('edit mode', () => {
    it('is prefilled, titled "Edit link" and shows when it was saved and opened', async () => {
      const api = fakeApi(() => of(PLAIN));
      await setup(api, { link: EDITED });

      expect(dialog().textContent).toContain('Edit link');
      expect(input('Link').value).toBe('https://example.org/saved');
      expect(input('Title').value).toBe('Saved title');
      expect(input('Note').value).toBe('A note');
      expect(dialog().textContent).toMatch(/Saved .* ago, last opened /);
      expect(dialog().querySelector('.add-link__preview')).toBeNull();
      button('Save changes');
      button('Delete');
      expect(api.preview).not.toHaveBeenCalled();
    });

    it('says "never opened" for a link that was not opened', async () => {
      const api = fakeApi(() => of(PLAIN));
      await setup(api, { link: { ...EDITED, lastOpenedAt: null } });

      expect(dialog().textContent).toContain('never opened');
    });

    it('sends only the changed fields and resolves with the updated link', async () => {
      const api = fakeApi(() => of(PLAIN));
      const { result } = await setup(api, { link: EDITED });

      await type('Title', ' New title ');
      await type('Note', '');
      button('Save changes').click();

      const outcome = await result;
      expect(api.update).toHaveBeenCalledWith(EDITED.id, { title: 'New title', note: null });
      expect(api.create).not.toHaveBeenCalled();
      expect(outcome?.action).toBe(ADD_LINK_ACTION.Saved);
    });

    it('has "Add to favorites" in edit mode only and sends the change', async () => {
      const api = fakeApi(() => of(PLAIN));
      const { result } = await setup(api, { link: { ...EDITED, isFavorite: false } });

      const box = checkbox('Add to favorites');
      expect(box.checked).toBe(false);
      box.click();
      TestBed.tick();
      button('Save changes').click();

      await result;
      expect(api.update).toHaveBeenCalledWith(EDITED.id, { isFavorite: true });
    });

    it('has no "Add several links" in edit mode', async () => {
      await setup(
        fakeApi(() => of(PLAIN)),
        { link: EDITED },
      );
      expect(dialog().textContent).not.toContain('Add several links');
    });

    it('has a Type select in edit mode that sends a changed kind', async () => {
      const api = fakeApi(() => of(PLAIN));
      const { result } = await setup(api, { link: { ...EDITED, kind: LINK_KIND.Article } });

      const selects = [...dialog().querySelectorAll('ui-select')];
      const type = selects.find((select) => select.textContent?.includes('Type'));
      expect(type?.textContent).toContain('Article');
      type?.querySelector<HTMLButtonElement>('button')?.click();
      await until(() => {
        expect(document.querySelectorAll('[role="option"]').length).toBeGreaterThan(0);
      });
      [...document.querySelectorAll<HTMLElement>('[role="option"]')]
        .find((option) => option.textContent?.trim() === 'Shopping')
        ?.click();
      TestBed.tick();
      button('Save changes').click();

      await result;
      expect(api.update).toHaveBeenCalledWith(EDITED.id, { kind: LINK_KIND.Shopping });
    });

    it('has no Type select when adding', async () => {
      const api = fakeApi(() => of(PLAIN));
      await setup(api);
      expect(dialog().textContent).not.toContain('Type');
    });

    it('closes without a request when nothing changed', async () => {
      const api = fakeApi(() => of(PLAIN));
      const { result } = await setup(api, { link: EDITED });

      button('Save changes').click();

      expect(await result).toBeUndefined();
      expect(api.update).not.toHaveBeenCalled();
    });

    it('does not autofill the title from the preview of a changed URL', async () => {
      const api = fakeApi(() => of(PLAIN));
      await setup(api, { link: EDITED });

      await type('Link', 'https://example.org/post');
      await until(() => {
        expect(api.preview).toHaveBeenCalledTimes(1);
      });
      expect(input('Title').value).toBe('Saved title');
      expect(dialog().querySelector('.add-link__preview')).toBeNull();
    });

    it('does not treat the link itself as a duplicate', async () => {
      let answered!: () => void;
      const previewAnswered = new Promise<void>((resolve) => {
        answered = resolve;
      });
      const api = fakeApi(() => of(MOCK_LINK_PREVIEW_DUPLICATE).pipe(tap({ complete: answered })));
      await setup(api, { link: { ...EDITED, id: MOCK_ID.LinkAngular } });
      await type('Link', MOCK_LINK_PREVIEW_DUPLICATE.preview.url);
      await previewAnswered;
      // Let the resource publish the answer and the view render it.
      await Promise.resolve();
      TestBed.tick();
      expect(dialog().querySelector('ui-notice')).toBeNull();
    });

    it('warns about a duplicate of another link and offers no "Open saved"', async () => {
      const api = fakeApi(() => of(MOCK_LINK_PREVIEW_DUPLICATE));
      await setup(api, { link: { ...EDITED, id: 'another-id' } });

      await type('Link', MOCK_LINK_PREVIEW_DUPLICATE.preview.url);
      await until(() => {
        expect(dialog().querySelector('ui-notice')?.textContent).toContain('already saved');
      });
      expect(() => button('Open saved')).toThrow();
      button('Save changes');
    });

    it('requires a title and does not save without one', async () => {
      const api = fakeApi(() => of(PLAIN));
      await setup(api, { link: EDITED });

      await type('Title', '  ');
      button('Save changes').click();
      await until(() => {
        expect(dialog().textContent).toContain('Enter a title');
      });
      expect(api.update).not.toHaveBeenCalled();
    });

    it('hands the link back to the caller on Delete', async () => {
      const api = fakeApi(() => of(PLAIN));
      const { result } = await setup(api, { link: EDITED });

      button('Delete').click();

      expect(await result).toEqual({ action: ADD_LINK_ACTION.Delete, link: EDITED });
      expect(api.update).not.toHaveBeenCalled();
    });

    it('shows an error and stays open when the update fails', async () => {
      const api = fakeApi(() => of(PLAIN));
      api.update.mockReturnValue(throwError(() => new Error('boom')));
      await setup(api, { link: EDITED });

      await type('Title', 'Changed');
      button('Save changes').click();
      await until(() => {
        expect(dialog().textContent).toContain("Couldn't save the link");
      });
      expect(button('Save changes').disabled).toBe(false);
    });

    it('has no axe violations', async () => {
      const api = fakeApi(() => of(PLAIN));
      await setup(api, { link: EDITED });

      const results = await axe.run(dialog(), { rules: { 'color-contrast': { enabled: false } } });
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  });

  describe('Settings › Library › Saving (#284)', () => {
    it('starts in "New links go to" when the page has no folder', async () => {
      const api = fakeApi(() => of(PLAIN));
      const { result } = await setup(api, {}, { newLinksFolderId: MOCK_ID.FolderAngular });

      await type('Link', 'https://example.org/post');
      await until(() => {
        expect(input('Title').value).toBe('A fine post');
      });
      button('Save link').click();
      await result;
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({ folderId: MOCK_ID.FolderAngular }),
      );
    });

    it('keeps the folder of the page over "New links go to"', async () => {
      const api = fakeApi(() => of(PLAIN));
      const { result } = await setup(
        api,
        { folderId: MOCK_ID.FolderReading },
        { newLinksFolderId: MOCK_ID.FolderAngular },
      );

      await type('Link', 'https://example.org/post');
      await until(() => {
        expect(input('Title').value).toBe('A fine post');
      });
      button('Save link').click();
      await result;
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({ folderId: MOCK_ID.FolderReading }),
      );
    });

    it('always checks duplicates, even with previews off (#315: no longer a setting)', async () => {
      const api = fakeApi(() => of({ ...PLAIN, fetched: false }));
      await setup(api, {}, { fetchPreviews: false });

      await type('Link', 'https://example.org/post');
      await until(() => {
        expect(api.preview).toHaveBeenCalledWith('https://example.org/post');
      });
      expect(input('Title').value).toBe('');
    });

    describe('"Check spelling" next to the note (#315)', () => {
      // A saved language choice is remembered in the browser; the next spec must not see it.
      afterEach(() => {
        localStorage.removeItem(LANGUAGE_STORAGE_KEY);
      });

      it('saves "Check spelling" under the note on the account at once (#315)', async () => {
        const update = vi.fn((request: UpdateUserSettingsRequest) =>
          of({ ...ACCOUNT_FOR_SPELLING, ...request }),
        );
        await setup(
          fakeApi(() => of(PLAIN)),
          {},
          {},
          update,
        );
        const box = checkbox('Check spelling');
        expect(box.checked).toBe(true);
        expect(input('Note').getAttribute('spellcheck')).toBe('true');

        box.click();
        await vi.waitFor(() => {
          TestBed.tick();
          expect(update).toHaveBeenCalledWith({ spellcheck: false });
          expect(input('Note').getAttribute('spellcheck')).toBe('false');
        });
      });

      it('puts "Check spelling" back when saving it fails', async () => {
        const update = vi.fn(() => throwError(() => new Error('down')));
        await setup(
          fakeApi(() => of(PLAIN)),
          {},
          {},
          update,
        );
        const box = checkbox('Check spelling');

        box.click();
        await vi.waitFor(() => {
          TestBed.tick();
          expect(update).toHaveBeenCalled();
          expect(checkbox('Check spelling').checked).toBe(true);
          expect(input('Note').getAttribute('spellcheck')).toBe('true');
        });
      });
    });

    it('with previews off only checks duplicates: no skeleton, no "no preview" notice', async () => {
      const api = fakeApi(() =>
        of({ ...MOCK_LINK_PREVIEW_DUPLICATE, fetched: false }).pipe(delay(50)),
      );
      await setup(api, {}, { fetchPreviews: false });

      await type('Link', MOCK_LINK_PREVIEW_DUPLICATE.preview.url);
      expect(dialog().querySelector('ui-skeleton')).toBeNull();
      await until(() => {
        expect(dialog().querySelector('ui-notice')?.textContent).toContain(
          'You already saved this link',
        );
      });
      expect(dialog().querySelectorAll('ui-notice')).toHaveLength(1);
      expect(input('Title').value).toBe('');
    });
  });

  it('has no axe violations', async () => {
    const api = fakeApi(() => of(MOCK_LINK_PREVIEW_DUPLICATE));
    await setup(api);
    await type('Link', MOCK_LINK_PREVIEW_DUPLICATE.preview.url);
    await until(() => {
      expect(dialog().querySelector('ui-notice')).not.toBeNull();
    });

    const results = await axe.run(dialog(), { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
