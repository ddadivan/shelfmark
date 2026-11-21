import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { axeViolations } from '../../../../../testing/axe';
import { createLinkPreviewStub, PREVIEW_STUB_LINK } from '../../../../../testing/link-preview-stub';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { PREVIEW_BODY_KIND } from '../../models/preview-body-kind.const';
import { PREVIEW_CLICK_SETTINGS } from '../../models/preview-click-settings.const';
import { LinkPreviewService } from '../../services/link-preview.service';
import { PreviewBodyComponent } from './preview-body.component';

async function setup(link = PREVIEW_STUB_LINK, clickSettings = true) {
  const stub = createLinkPreviewStub(link);
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: LinkPreviewService, useValue: stub },
      { provide: PREVIEW_CLICK_SETTINGS, useValue: clickSettings },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(PreviewBodyComponent);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  return { stub, fixture, element, loader: TestbedHarnessEnvironment.loader(fixture) };
}

describe('PreviewBodyComponent', () => {
  it('shows an active progress bar while there is no link yet', async () => {
    const { element, stub, fixture } = await setup();
    stub.link.set(null);
    stub.body.set(PREVIEW_BODY_KIND.Loading);
    await fixture.whenStable();
    await vi.waitFor(() => {
      expect(element.querySelector('[role="progressbar"]')?.getAttribute('aria-label')).toBe(
        'Loading the preview',
      );
    });
    expect(element.querySelector('iframe')).toBeNull();
  });

  it('puts an https site in a titled, sandboxed frame', async () => {
    const { element } = await setup();
    const frame = element.querySelector('iframe');
    expect(frame?.getAttribute('src')).toBe('https://www.angular.dev/overview');
    expect(frame?.getAttribute('title')).toBe('Page of Angular overview');
    expect(frame?.getAttribute('sandbox')).not.toContain('allow-top-navigation');
  });

  it('puts the player address of a video in the frame', async () => {
    const { element, stub, fixture } = await setup();
    stub.body.set(PREVIEW_BODY_KIND.Video);
    stub.embedUrl.set('https://www.youtube-nocookie.com/embed/abc');
    await fixture.whenStable();
    expect(element.querySelector('iframe')?.getAttribute('src')).toBe(
      'https://www.youtube-nocookie.com/embed/abc',
    );
  });

  it('reports an address the frame refuses, and leaves the frame blank', async () => {
    const { stub, fixture, element } = await setup();
    stub.body.set(PREVIEW_BODY_KIND.Site);
    stub.link.set({ ...PREVIEW_STUB_LINK, url: 'http://www.angular.dev/overview' });
    await fixture.whenStable();
    // A plain http address is never given to the iframe: the frame reports it as rejected.
    expect(stub.frameTimedOut).toHaveBeenCalled();
    expect(element.querySelector('iframe')?.getAttribute('src') ?? 'about:blank').toBe(
      'about:blank',
    );
  });

  describe('blocked', () => {
    async function blocked(clickSettings = true) {
      const context = await setup(PREVIEW_STUB_LINK, clickSettings);
      context.stub.body.set(PREVIEW_BODY_KIND.Blocked);
      context.stub.host.set('angular.dev');
      await context.fixture.whenStable();
      return context;
    }

    it('names the domain and offers to open it in a new tab', async () => {
      const { element, loader, stub } = await blocked();
      expect(element.textContent).toContain("angular.dev doesn't open inside other apps");
      const open = await loader.getHarness(UiButtonHarness.with({ text: 'Open in new tab' }));
      await open.click();
      expect(stub.openInNewTab).toHaveBeenCalledTimes(1);
      expect(element.querySelector('iframe')).toBeNull();
    });

    it('has no axe violations', async () => {
      const { element } = await blocked();
      expect(await axeViolations(element)).toEqual([]);
    });

    it('offers no open button for an address that cannot be opened', async () => {
      const { stub, fixture, loader } = await blocked();
      stub.href.set(undefined);
      await fixture.whenStable();
      expect(await loader.getAllHarnesses(UiButtonHarness)).toHaveLength(0);
    });

    it('saves the "always open in a new tab" choice both ways', async () => {
      const { element, stub, fixture } = await blocked();
      const box = element.querySelector<HTMLInputElement>('input[type="checkbox"]');
      expect(box?.checked).toBe(false);
      box?.click();
      expect(stub.setAlwaysNewTab).toHaveBeenLastCalledWith(true);

      stub.alwaysNewTab.set(true);
      await fixture.whenStable();
      const ticked = element.querySelector<HTMLInputElement>('input[type="checkbox"]');
      expect(ticked?.checked).toBe(true);
      ticked?.click();
      expect(stub.setAlwaysNewTab).toHaveBeenLastCalledWith(false);
    });

    it('has no checkbox while the click settings are off (#555)', async () => {
      const { element } = await blocked(false);
      expect(element.querySelector('input[type="checkbox"]')).toBeNull();
      expect(element.textContent).toContain('angular.dev');
    });

    it('has no checkbox without a host', async () => {
      const { element, stub, fixture } = await blocked();
      stub.host.set('');
      await fixture.whenStable();
      expect(element.querySelector('input[type="checkbox"]')).toBeNull();
    });
  });
});
