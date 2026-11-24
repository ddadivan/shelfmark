import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { ExtensionBannerService } from '../../../../core/browser-extension/extension-banner.service';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { ExtensionBannerComponent } from './extension-banner.component';

const STORE_URL = 'https://chromewebstore.google.com/detail/shelfmark/abc';

async function setup(options: { shown?: boolean; wide?: boolean } = {}) {
  const bannerShown = signal(options.shown ?? true);
  const dismiss = vi.fn(() => bannerShown.set(false));
  TestBed.configureTestingModule({
    providers: [
      { provide: ExtensionBannerService, useValue: { bannerShown, dismiss, storeUrl: STORE_URL } },
      { provide: ViewportService, useValue: { wide: signal(options.wide ?? true) } },
    ],
  });
  const fixture = await createTranslated(ExtensionBannerComponent);
  const root = fixture.nativeElement as HTMLElement;
  const loader = TestbedHarnessEnvironment.loader(fixture);
  return { fixture, root, loader, dismiss };
}

describe('ExtensionBannerComponent', () => {
  it('renders nothing while the banner is not shown', async () => {
    const { root } = await setup({ shown: false });

    expect(root.querySelector('section')).toBeNull();
  });

  it('offers the extension with the store link in a new tab', async () => {
    const { root, loader } = await setup();
    const install = await loader.getHarness(UiButtonHarness.with({ text: 'Install extension' }));

    expect(root.querySelector('h2')?.textContent?.trim()).toBe(
      'Save pages straight from your browser.',
    );
    expect(root.textContent).toContain('Alt+Shift+S');
    expect(await install.getHref()).toBe(STORE_URL);
    expect(await install.getName()).toBe(
      'Install extension from the Chrome Web Store (opens in a new tab)',
    );
    expect(root.querySelector<HTMLAnchorElement>(`a[href="${STORE_URL}"]`)?.target).toBe('_blank');
    // Shelf draws one strip without the popup screenshot.
    expect(root.querySelector('img')).toBeNull();
  });

  it('closes through the service with "Not now"', async () => {
    const { loader, dismiss } = await setup();

    await (await loader.getHarness(UiButtonHarness.with({ label: 'Not now' }))).click();

    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations', async () => {
    const { root } = await setup();

    expect(await axeViolations(root)).toEqual([]);
  });
});
