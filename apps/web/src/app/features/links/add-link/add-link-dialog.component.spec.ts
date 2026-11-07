import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import type { LinkPreviewResponse, LinkResponse } from '@shelfmark/contracts';
import { MOCK_ID, MOCK_LINK_PREVIEW_DUPLICATE, MOCK_LINKS } from '@shelfmark/contracts/testing';
import axe from 'axe-core';
import { delay, of, tap, throwError, type Observable } from 'rxjs';
import { APP_LANG } from '../../../core/i18n/models/app-lang.const';
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

const PLAIN: LinkPreviewResponse = {
  preview: {
    url: 'https://example.org/post',
    title: 'A fine post',
    description: 'About a thing.',
    imageUrl: null,
    faviconUrl: null,
  },
  duplicate: null,
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

async function setup(api: FakeApi, data?: Parameters<AddLinkDialogService['open']>[0]) {
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
  await vi.waitFor(() => {
    TestBed.tick();
    expect(root()).not.toBeNull();
  });
  return { result };
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
  it('starts empty with the hint and no preview', async () => {
    const api = fakeApi(() => of(PLAIN));
    await setup(api);

    expect(dialog().textContent).toContain('Add link');
    expect(dialog().textContent).toContain('Paste a link');
    expect(dialog().querySelector('.add-link__preview')).toBeNull();
    expect(api.preview).not.toHaveBeenCalled();
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
    });
    expect(outcome?.action).toBe(ADD_LINK_ACTION.Saved);
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
