import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingFooterComponent } from './landing-footer.component';

describe('LandingFooterComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('renders the copyright and an external GitHub link', async () => {
    const fixture = await createTranslated(LandingFooterComponent);
    const root = fixture.nativeElement as HTMLElement;
    const link = root.querySelector<HTMLAnchorElement>('a[target="_blank"]');

    expect(root.querySelector('footer')?.textContent).toContain('© 2026 Shelfmark');
    expect(link?.getAttribute('href')).toBe('https://github.com/ddadivan/shelfmark');
    expect(link?.target).toBe('_blank');
    expect(link?.rel).toContain('noopener');
  });

  it('links to the privacy policy inside the app', async () => {
    const fixture = await createTranslated(LandingFooterComponent);
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/privacy"]');

    expect(link?.textContent?.trim()).toBe('Privacy');
    expect(link?.getAttribute('target')).toBeNull();
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingFooterComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
