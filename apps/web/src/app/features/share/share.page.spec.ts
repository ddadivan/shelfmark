import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import type { LinkPreviewResponse, LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINK_PREVIEW_DUPLICATE, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { delay, of, throwError, type Observable } from 'rxjs';
import { AppTranslocoLoader } from '../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../core/i18n/transloco.config';
import { MockFoldersApi } from '../links/mock/mock-folders.api';
import { MockTagsApi } from '../links/mock/mock-tags.api';
import { FOLDERS_API } from '../links/models/folders-api.const';
import { LINKS_API } from '../links/models/links-api.const';
import type { LinksApi } from '../links/models/links-api.interface';
import { TAGS_API } from '../links/models/tags-api.const';
import SharePage from './share.page';

const PREVIEW: LinkPreviewResponse = {
  preview: {
    url: 'https://example.com/a',
    title: 'A fine page',
    description: 'About a thing.',
    imageUrl: null,
    faviconUrl: null,
  },
  duplicate: null,
};

function fakeApi(preview: () => Observable<LinkPreviewResponse> = () => of(PREVIEW)) {
  return {
    preview: vi.fn<LinksApi['preview']>(preview),
    create: vi.fn<LinksApi['create']>((request) =>
      of<LinkResponse>({ ...MOCK_LINKS[0], url: request.url, title: request.title ?? request.url }),
    ),
  };
}

async function open(url: string, api = fakeApi()) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'share', component: SharePage },
        { path: 'links', children: [] },
      ]),
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
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url, SharePage);
  await settle(harness);
  const root = harness.routeNativeElement as HTMLElement;
  return { api, harness, root, router: TestBed.inject(Router) };
}

async function settle(harness: RouterTestingHarness): Promise<void> {
  await vi.waitFor(() => {
    harness.detectChanges();
    TestBed.tick();
  });
  await harness.fixture.whenStable();
  harness.detectChanges();
}

function button(root: HTMLElement, name: string): HTMLButtonElement {
  const found = [...root.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent.trim().startsWith(name),
  );
  if (!found) {
    throw new Error(`No button "${name}"`);
  }
  return found;
}

describe('SharePage', () => {
  it('shows the quick save form with the preview of the URL found in the text', async () => {
    const { api, root } = await open('/share?text=Look%20https%3A%2F%2Fexample.com%2Fa');

    expect(api.preview).toHaveBeenCalledExactlyOnceWith('https://example.com/a');
    expect(root.querySelector('h1')?.textContent).toContain('Save to Shelfmark');
    expect(root.textContent).toContain('A fine page');
    expect(root.textContent).toContain('example.com');
    expect(api.create).not.toHaveBeenCalled();
  });

  it('saves the link, then leaves for the library', async () => {
    const { api, harness, root, router } = await open(
      '/share?url=https%3A%2F%2Fexample.com%2Fa&title=Hinted',
    );

    button(root, 'Save').click();
    await vi.waitFor(() => {
      expect(router.url).toBe('/links');
    });
    await settle(harness).catch(() => undefined);

    expect(api.create).toHaveBeenCalledExactlyOnceWith({
      url: 'https://example.com/a',
      title: 'A fine page',
    });
  });

  it('uses the shared title while the preview loads and when it fails', async () => {
    const { api, root } = await open(
      '/share?url=https%3A%2F%2Fexample.com%2Fa&title=Hinted',
      fakeApi(() => throwError(() => new Error('preview failed'))),
    );

    expect(root.textContent).toContain('Hinted');
    expect(root.textContent).toContain("Couldn't load a preview");

    button(root, 'Save').click();
    await vi.waitFor(() => {
      expect(api.create).toHaveBeenCalledWith({ url: 'https://example.com/a', title: 'Hinted' });
    });
  });

  it('falls back to the address as the title when nothing else is known', async () => {
    const { api, root } = await open(
      '/share?url=https%3A%2F%2Fexample.com%2Fa',
      fakeApi(() => throwError(() => new Error('preview failed'))),
    );

    button(root, 'Save').click();
    await vi.waitFor(() => {
      expect(api.create).toHaveBeenCalledWith({
        url: 'https://example.com/a',
        title: 'example.com/a',
      });
    });
  });

  it('shows the duplicate notice and offers "Save anyway"', async () => {
    const { root } = await open(
      `/share?url=${encodeURIComponent(MOCK_LINK_PREVIEW_DUPLICATE.preview.url)}`,
      fakeApi(() => of(MOCK_LINK_PREVIEW_DUPLICATE).pipe(delay(0))),
    );

    await vi.waitFor(() => {
      expect(root.querySelector('ui-notice')?.textContent).toContain('You already saved this link');
    });
    expect(button(root, 'Save anyway')).toBeTruthy();
  });

  it('keeps the form and says so when the save fails', async () => {
    const api = fakeApi();
    api.create.mockReturnValue(throwError(() => new Error('save failed')));
    const { harness, root, router } = await open('/share?url=https%3A%2F%2Fexample.com%2Fa', api);

    button(root, 'Save').click();
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(root.textContent).toContain("Couldn't save the link");
    });

    expect(router.url).toContain('/share');
  });

  it.each([
    ['a javascript: URL', '/share?url=javascript%3Aalert(1)'],
    ['a data: URL in the text', '/share?text=data%3Atext%2Fhtml%2C%3Cscript%3E'],
    ['no parameters at all', '/share'],
    ['only a title', '/share?title=https%3A%2F%2Fexample.com%2Fa'],
  ])('shows the error and saves nothing for %s', async (_name, url) => {
    const { api, root } = await open(url);

    expect(root.querySelector('h1')?.textContent).toContain('Nothing to save');
    expect(root.querySelector('ui-notice')?.textContent).toContain('nothing was saved');
    expect(root.querySelector('form')).toBeNull();
    expect(api.preview).not.toHaveBeenCalled();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('goes to the library from the error state', async () => {
    const { harness, root, router } = await open('/share');

    button(root, 'Go to my links').click();
    await vi.waitFor(() => {
      expect(router.url).toBe('/links');
    });
    await settle(harness).catch(() => undefined);
  });

  it('renders hostile text as text, never as markup', async () => {
    const { root } = await open(
      `/share?url=https%3A%2F%2Fexample.com%2Fa&title=${encodeURIComponent('<img src=x onerror=alert(1)>')}`,
      fakeApi(() => throwError(() => new Error('preview failed'))),
    );

    expect(root.querySelector('img')).toBeNull();
    expect(root.textContent).toContain('<img src=x onerror=alert(1)>');
  });
});
