import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingHeroComponent } from './landing-hero.component';

describe('LandingHeroComponent', () => {
  it('renders the headline as the page h1', async () => {
    const fixture = await createTranslated(LandingHeroComponent);
    const root = fixture.nativeElement as HTMLElement;
    const heading = root.querySelector('h1');

    expect(heading?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Paste a link. Find it again. Even in a year.',
    );
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.textContent).toContain('For everything you send to Saved Messages');
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingHeroComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
