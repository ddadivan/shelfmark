import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import type { LinkPreviewResponse, LinkResponse } from '@shelfmark/contracts';
import { MOCK_ID, MOCK_LINK_PREVIEW_DUPLICATE, MOCK_LINKS } from '@shelfmark/contracts/testing';
import axe from 'axe-core';
import { delay, of, throwError, type Observable } from 'rxjs';
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

interface FakeApi extends LinksApi {
  preview: ReturnType<typeof vi.fn<LinksApi['preview']>>;
  create: ReturnType<typeof vi.fn<LinksApi['create']>>;
}

function fakeApi(preview: () => Observable<LinkPreviewResponse>): FakeApi {
  return {
    preview: vi.fn<LinksApi['preview']>(preview),
    create: vi.fn<LinksApi['create']>((request) =>
      of<LinkResponse>({ ...MOCK_LINKS[0], url: request.url, title: request.title ?? request.url }),
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
