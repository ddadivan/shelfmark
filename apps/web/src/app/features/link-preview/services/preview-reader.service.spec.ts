import { TestBed } from '@angular/core/testing';
import { LINK_KIND, READER_BLOCK_KIND, type ReaderArticle } from '@shelfmark/contracts';
import { of, throwError } from 'rxjs';
import { createLinkPreviewStub, PREVIEW_STUB_LINK } from '../../../../testing/link-preview-stub';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { READER_API } from '../../reader/models/reader-api.const';
import { PREVIEW_BODY_KIND } from '../models/preview-body-kind.const';
import { PREVIEW_MODE } from '../models/preview-mode.const';
import { LinkPreviewService } from './link-preview.service';
import { PreviewReaderService } from './preview-reader.service';

const ARTICLE: ReaderArticle = {
  title: 'Angular overview',
  author: 'Angular team',
  publishedAt: '2026-10-02T10:00:00.000Z',
  minutes: 10,
  blocks: [{ kind: READER_BLOCK_KIND.Paragraph, text: 'Text', items: [], imageUrl: null }],
};

async function setup(article: ReaderArticle | null | 'fail' = ARTICLE) {
  const preview = createLinkPreviewStub();
  const api = {
    article: vi.fn(() =>
      article === 'fail' ? throwError(() => new Error('offline')) : of({ article }),
    ),
    progress: vi.fn(() => of([])),
    saveProgress: vi.fn(() => of(undefined)),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      PreviewReaderService,
      { provide: LinkPreviewService, useValue: preview },
      { provide: READER_API, useValue: api },
    ],
  });
  await loadEnglish();
  const service = TestBed.inject(PreviewReaderService);
  const settle = () => TestBed.tick();
  return { service, preview, api, settle };
}

describe('PreviewReaderService', () => {
  afterEach(() => localStorage.clear());

  it('starts on Site and loads nothing until Reader is chosen', async () => {
    const { service, api } = await setup();
    expect(service.mode()).toBe(PREVIEW_MODE.Site);
    expect(service.reading()).toBe(false);
    TestBed.tick();
    expect(api.article).not.toHaveBeenCalled();
  });

  it('loads the article in Reader and describes it', async () => {
    const { service, api } = await setup();
    service.setMode(PREVIEW_MODE.Reader);
    await vi.waitFor(() => expect(service.article()).toEqual(ARTICLE));
    expect(api.article).toHaveBeenCalledWith(PREVIEW_STUB_LINK.id);
    expect(service.empty()).toBe(false);
    expect(service.meta()).toContain('Angular team');
    expect(service.meta()).toContain('10 min read');
    expect(service.notice()).toBe('');
  });

  it('remembers the mode per site', async () => {
    const { service, preview } = await setup();
    service.setMode(PREVIEW_MODE.Reader);
    preview.host.set('example.org');
    expect(service.mode()).toBe(PREVIEW_MODE.Site);
    preview.host.set('www.angular.dev');
    expect(service.mode()).toBe(PREVIEW_MODE.Reader);
  });

  it('explains a page without text, a video, and a blocked site', async () => {
    const { service, preview } = await setup(null);
    service.setMode(PREVIEW_MODE.Reader);
    await vi.waitFor(() => expect(service.empty()).toBe(true));
    expect(service.notice()).toContain('This page has no article text');
    preview.link.set({ ...PREVIEW_STUB_LINK, kind: LINK_KIND.Video });
    expect(service.notice()).toContain('A video has no text to read');
  });

  it('says why Reader shows when the site refuses the frame', async () => {
    const { service, preview } = await setup();
    preview.body.set(PREVIEW_BODY_KIND.Blocked);
    service.setMode(PREVIEW_MODE.Reader);
    await vi.waitFor(() => expect(service.article()).not.toBeNull());
    expect(service.notice()).toContain("doesn't allow showing the page here");
  });

  it('treats a failed request as a page without text', async () => {
    const { service } = await setup('fail');
    service.setMode(PREVIEW_MODE.Reader);
    await vi.waitFor(() => expect(service.empty()).toBe(true));
    expect(service.article()).toBeNull();
  });

  it('keeps reading progress in steps, and retries after a failed write', async () => {
    const { service, api } = await setup();
    service.setMode(PREVIEW_MODE.Reader);
    await vi.waitFor(() => expect(service.article()).not.toBeNull());
    await service.onProgress(0.02);
    expect(api.saveProgress).not.toHaveBeenCalled();
    await service.onProgress(0.5);
    expect(api.saveProgress).toHaveBeenCalledWith(PREVIEW_STUB_LINK.id, {
      fraction: 0.5,
      minutesLeft: 5,
    });
    await service.onProgress(0.52);
    expect(api.saveProgress).toHaveBeenCalledTimes(1);
    api.saveProgress.mockReturnValueOnce(throwError(() => new Error('offline')));
    await service.onProgress(0.7);
    await service.onProgress(0.71);
    expect(api.saveProgress).toHaveBeenCalledTimes(3);
  });

  it('toggles the details and changes the reading settings', async () => {
    const { service } = await setup();
    expect(service.detailsOpen()).toBe(false);
    service.toggleDetails();
    expect(service.detailsOpen()).toBe(true);
    service.setSettings({ font: 'serif' });
    expect(service.settings().font).toBe('serif');
  });
});
