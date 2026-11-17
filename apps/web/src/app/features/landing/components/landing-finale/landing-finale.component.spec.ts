import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '../../../../core/auth/auth.store';
import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { BrowserExtensionService } from '../../../../core/browser-extension/browser-extension.service';
import { LandingFinaleComponent } from './landing-finale.component';

const STORE_URL = 'https://chromewebstore.google.com/detail/shelfmark/abc';

function offerExtension(offered: boolean): void {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: BrowserExtensionService,
        useValue: { offered: signal(offered), storeUrl: STORE_URL },
      },
    ],
  });
}

describe('LandingFinaleComponent', () => {
  it('renders the heading and both calls to action', async () => {
    const fixture = await createTranslated(LandingFinaleComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h2')?.textContent?.trim()).toBe('Empty your Saved Messages.');
    expect(root.querySelector('.landing-finale__lead')?.textContent).toContain(
      'Everything you save from now on lands on one shelf',
    );
    expect(root.querySelector('a[href="/sign-in"]')).not.toBeNull();
    const labels = Array.from(root.querySelectorAll('a')).map((a) => a.textContent?.trim());
    expect(labels).toEqual(['Open the demo', 'Sign in']);
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingFinaleComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });

  it('offers "Back to my shelf" and no demo or sign-in to a signed-in person (/about)', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthStore, useValue: { user: signal({ id: 'u' }) } }],
    });
    const fixture = await createTranslated(LandingFinaleComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('a[href="/links"]')?.textContent).toContain('Back to my shelf');
    expect(root.querySelector('a[href="/sign-in"]')).toBeNull();
    expect(root.querySelector('a[href="/demo"]')).toBeNull();
  });

  describe('browser extension line (#455)', () => {
    it('is not rendered where the extension is not offered', async () => {
      offerExtension(false);
      const fixture = await createTranslated(LandingFinaleComponent);
      const root = fixture.nativeElement as HTMLElement;

      expect(root.querySelector('.landing-finale__extension')).toBeNull();
      expect(root.querySelector(`a[href="${STORE_URL}"]`)).toBeNull();
    });

    it('links the Chrome Web Store in a new tab on a desktop Chromium browser', async () => {
      offerExtension(true);
      const fixture = await createTranslated(LandingFinaleComponent);
      const root = fixture.nativeElement as HTMLElement;
      const link = root.querySelector<HTMLAnchorElement>(`a[href="${STORE_URL}"]`);

      expect(root.querySelector('.landing-finale__extension')?.textContent).toContain(
        'Using Chrome, Edge, Brave or Arc? Save any page in one click.',
      );
      expect(link?.textContent).toContain('Get the browser extension');
      expect(link?.textContent).toContain('opens in a new tab');
      expect(link?.target).toBe('_blank');
      expect(link?.rel).toBe('noopener noreferrer');
      expect(await axeViolations(root)).toEqual([]);
    });
  });
});
