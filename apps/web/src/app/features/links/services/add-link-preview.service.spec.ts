import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { LINK_KIND, type LinkPreviewResponse, type LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINK_PREVIEW_DUPLICATE, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { UI_DIALOG_DATA } from '@shelfmark/ui';
import { of, throwError, type Observable } from 'rxjs';
import { AppTranslocoLoader } from '../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../core/i18n/transloco.config';
import { LINKS_API } from '../models/links-api.const';
import type { LinksApi } from '../models/links-api.interface';
import type { AddLinkData } from '../models/add-link-data.interface';
import { PREVIEW_STATE } from '../models/preview-state.const';
import { AddLinkFormService } from './add-link-form.service';
import { AddLinkPreviewService } from './add-link-preview.service';

const URL_TEXT = 'https://example.org/post';
const FETCHED: LinkPreviewResponse = {
  preview: {
    kind: LINK_KIND.Article,
    url: URL_TEXT,
    title: 'A fine post',
    description: 'About a thing.',
    imageUrl: null,
    faviconUrl: null,
  },
  duplicate: null,
  fetched: true,
};

async function setup(preview: () => Observable<LinkPreviewResponse>, data: AddLinkData = {}) {
  const api = { preview: vi.fn<LinksApi['preview']>(preview) };
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: LINKS_API, useValue: api },
      { provide: UI_DIALOG_DATA, useValue: data },
      AddLinkFormService,
      AddLinkPreviewService,
    ],
  });
  await new Promise<void>((resolve) => {
    TestBed.inject(TranslocoService)
      .load(APP_LANG.En)
      .subscribe(() => {
        resolve();
      });
  });
  const formState = TestBed.inject(AddLinkFormService);
  const service = TestBed.inject(AddLinkPreviewService);
  TestBed.tick();
  return { api, formState, service };
}

/** Runs the debounce and lets the resource publish its answer. */
async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(400);
  TestBed.tick();
}

describe('AddLinkPreviewService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is idle until the address is a valid URL', async () => {
    const { api, formState, service } = await setup(() => of(FETCHED));

    formState.form.url().value.set('not a url');
    await settle();

    expect(service.previewState()).toBe(PREVIEW_STATE.Idle);
    expect(api.preview).not.toHaveBeenCalled();
  });

  it('debounces the request and fills an empty title from the fetched preview', async () => {
    const { api, formState, service } = await setup(() => of(FETCHED));

    formState.form.url().value.set(URL_TEXT);
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(100);
    expect(api.preview).not.toHaveBeenCalled();
    expect(service.previewState()).toBe(PREVIEW_STATE.Loading);

    await settle();

    expect(api.preview).toHaveBeenCalledExactlyOnceWith(URL_TEXT);
    expect(service.previewState()).toBe(PREVIEW_STATE.Ready);
    expect(formState.form.title().value()).toBe('A fine post');
    expect(service.fetchedPreview()?.title).toBe('A fine post');
  });

  it('keeps a title the user typed', async () => {
    const { formState } = await setup(() => of(FETCHED));

    formState.form.url().value.set(URL_TEXT);
    formState.form.title().value.set('My own title');
    formState.form.title().markAsDirty();
    await settle();

    expect(formState.form.title().value()).toBe('My own title');
  });

  it('fills the title with the address when the preview fails', async () => {
    const { formState, service } = await setup(() => throwError(() => new Error('boom')));

    formState.form.url().value.set(URL_TEXT);
    await settle();

    expect(service.previewState()).toBe(PREVIEW_STATE.Failed);
    expect(formState.form.title().value()).toBe('example.org/post');
  });

  it('does not fill the title when the server could not fetch the page', async () => {
    const { formState, service } = await setup(() => of({ ...FETCHED, fetched: false }));

    formState.form.url().value.set(URL_TEXT);
    await settle();

    expect(formState.form.title().value()).toBe('');
    expect(service.noPreview()).toBe(true);
  });

  it('clears an autofilled title when the URL is no longer valid', async () => {
    const { formState } = await setup(() => of(FETCHED));
    formState.form.url().value.set(URL_TEXT);
    await settle();
    expect(formState.form.title().value()).toBe('A fine post');

    formState.form.url().value.set('https://');
    await settle();

    expect(formState.form.title().value()).toBe('');
  });

  it('keeps a typed title when the URL is emptied', async () => {
    const { formState } = await setup(() => of(FETCHED));
    formState.form.url().value.set(URL_TEXT);
    await settle();
    formState.form.title().value.set('Mine');
    formState.form.title().markAsDirty();

    formState.form.url().value.set('');
    await settle();

    expect(formState.form.title().value()).toBe('Mine');
  });

  it('reports a duplicate of an already saved link when adding', async () => {
    const { formState, service } = await setup(() => of(MOCK_LINK_PREVIEW_DUPLICATE));

    formState.form.url().value.set(MOCK_LINK_PREVIEW_DUPLICATE.preview.url);
    await settle();

    expect(service.duplicate()).toEqual(MOCK_LINK_PREVIEW_DUPLICATE.duplicate);
  });

  describe('when editing', () => {
    const edited = (id: string): LinkResponse => ({
      ...MOCK_LINKS[0],
      id,
      url: 'https://example.org/saved',
      title: 'Saved title',
    });

    it('does not report the link itself as a duplicate', async () => {
      const duplicate = MOCK_LINK_PREVIEW_DUPLICATE.duplicate;
      expect(duplicate).not.toBeNull();
      const { formState, service } = await setup(() => of(MOCK_LINK_PREVIEW_DUPLICATE), {
        link: edited(duplicate?.id ?? ''),
      });

      formState.form.url().value.set(MOCK_LINK_PREVIEW_DUPLICATE.preview.url);
      await settle();

      expect(service.previewState()).toBe(PREVIEW_STATE.Ready);
      expect(service.duplicate()).toBeNull();
    });

    it('reports a duplicate of another link, and does not touch the title', async () => {
      const { formState, service } = await setup(() => of(MOCK_LINK_PREVIEW_DUPLICATE), {
        link: edited('another-id'),
      });

      formState.form.url().value.set(MOCK_LINK_PREVIEW_DUPLICATE.preview.url);
      await settle();

      expect(service.duplicate()).toEqual(MOCK_LINK_PREVIEW_DUPLICATE.duplicate);
      expect(formState.form.title().value()).toBe('Saved title');
      expect(service.previewData()).toBeNull();
    });

    it('asks nothing while the address is the saved one', async () => {
      const { api, service } = await setup(() => of(FETCHED), { link: edited('x') });

      await settle();

      expect(service.previewUrl()).toBeUndefined();
      expect(api.preview).not.toHaveBeenCalled();
    });
  });
});
