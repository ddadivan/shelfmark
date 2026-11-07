import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingHeaderComponent } from './landing-header.component';

describe('LandingHeaderComponent', () => {
  it('links to the anchor, the repository and sign-in', async () => {
    const fixture = await createTranslated(LandingHeaderComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('header')).not.toBeNull();
    expect(root.querySelector('nav')?.getAttribute('aria-label')).toBe('Main');
    expect(root.querySelector('a[href="#how"]')?.textContent).toContain("How it's built");
    expect(root.querySelector('a[href="/sign-in"]')?.textContent).toContain('Sign in');
  });

  it('opens GitHub in a new tab with noopener', async () => {
    const fixture = await createTranslated(LandingHeaderComponent);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      'a[href="https://github.com/ddadivan/shelfmark"]',
    );

    expect(link?.target).toBe('_blank');
    expect(link?.rel).toContain('noopener');
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingHeaderComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
