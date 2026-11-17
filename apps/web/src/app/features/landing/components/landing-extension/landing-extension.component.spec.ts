import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserExtensionService } from '../../../../core/browser-extension/browser-extension.service';
import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingExtensionComponent } from './landing-extension.component';

async function setup(fits: boolean) {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: BrowserExtensionService,
        useValue: { fits: signal(fits), storeUrl: 'https://store.example/shelfmark' },
      },
    ],
  });
  const fixture = await createTranslated(LandingExtensionComponent);
  return fixture.nativeElement as HTMLElement;
}

describe('LandingExtensionComponent', () => {
  it('renders nothing outside a desktop Chromium browser', async () => {
    const root = await setup(false);

    expect(root.querySelector('section')).toBeNull();
  });

  it('mentions the extension with the popup screenshot and no link (#455)', async () => {
    const root = await setup(true);

    expect(root.querySelector('h2')?.textContent?.trim()).toBe('Save the page you are on');
    expect(root.textContent).toContain('For Chrome, Edge, Brave and Arc.');
    expect(root.querySelector('img')?.getAttribute('alt')).toContain('The Shelfmark extension');
    expect(root.querySelector('a')).toBeNull();
    expect(root.textContent).not.toContain('store.example');
  });

  it('has no axe violations', async () => {
    const root = await setup(true);

    expect(await axeViolations(root)).toEqual([]);
  });
});
