import { readerBlock } from '../../../../../testing/reader-block';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { READER_BLOCK_KIND } from '@shelfmark/contracts';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { axeViolations } from '../../../../../testing/axe';
import { createLinkPreviewStub, PREVIEW_STUB_LINK } from '../../../../../testing/link-preview-stub';
import { createPreviewReaderStub } from '../../../../../testing/preview-reader-stub';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { PREVIEW_MODE } from '../../models/preview-mode.const';
import { LinkPreviewService } from '../../services/link-preview.service';
import { PreviewReaderService } from '../../services/preview-reader.service';
import { PreviewReaderComponent } from './preview-reader.component';

async function setup() {
  const preview = createLinkPreviewStub({
    ...PREVIEW_STUB_LINK,
    note: 'Read before the migration',
    summary: 'A tour of Angular',
    summarySource: 'ai',
    imageUrl: '/api/links/0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b/image?v=0123456789abcdef',
  });
  const reader = createPreviewReaderStub();
  reader.mode.set(PREVIEW_MODE.Reader);
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: LinkPreviewService, useValue: preview },
      { provide: PreviewReaderService, useValue: reader },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(PreviewReaderComponent);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  return { fixture, element, preview, reader, loader: TestbedHarnessEnvironment.loader(fixture) };
}

describe('PreviewReaderComponent', () => {
  it('shows a page without text as its picture, description and note, with Open', async () => {
    const { element, loader, preview, reader, fixture } = await setup();
    reader.notice.set('This page has no article text.');
    await fixture.whenStable();
    expect(element.querySelector('h2')?.textContent).toBe('Angular overview');
    expect(element.textContent).toContain('This page has no article text.');
    expect(element.querySelector('.ui-reader__figure--lead img')?.getAttribute('src')).toBe(
      '/api/links/0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b/image?v=0123456789abcdef',
    );
    expect(element.querySelector('.preview-reader__description')?.textContent).toBe(
      'A tour of Angular',
    );
    expect(element.querySelector('.preview-reader__note')?.textContent).toContain(
      'Read before the migration',
    );
    await (await loader.getHarness(UiButtonHarness.with({ text: /Open/ }))).click();
    expect(preview.openInNewTab).toHaveBeenCalledTimes(1);
    expect(await axeViolations(element)).toEqual([]);
  });

  it('shows the article with the AI summary on top and no picture', async () => {
    const { element, reader, fixture } = await setup();
    reader.article.set({
      version: 2,
      title: 'The article',
      author: null,
      publishedAt: null,
      minutes: 3,
      blocks: [readerBlock(READER_BLOCK_KIND.Heading, 'Part one')],
    });
    reader.meta.set('3 min read');
    await fixture.whenStable();
    expect(element.querySelector('h2')?.textContent).toBe('The article');
    expect(element.querySelector('h3')?.textContent).toBe('Part one');
    expect(element.querySelector('[slot=summary]')?.textContent).toContain('A tour of Angular');
    expect(element.querySelector('[slot=summary] ui-icon')).not.toBeNull();
    expect(element.querySelector('.ui-reader__figure--lead')).toBeNull();
    expect(element.querySelector('.preview-reader__note')).toBeNull();
  });

  it('shows a progress bar while the text loads and passes the scroll on', async () => {
    const { element, reader, fixture } = await setup();
    reader.loading.set(true);
    await fixture.whenStable();
    expect(element.querySelector('ui-reader')).toBeNull();
    expect(element.querySelector('[aria-busy="true"]')).not.toBeNull();
    reader.loading.set(false);
    await fixture.whenStable();
    element.querySelector('ui-reader')?.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    expect(reader.onProgress).toHaveBeenCalled();
  });
});
