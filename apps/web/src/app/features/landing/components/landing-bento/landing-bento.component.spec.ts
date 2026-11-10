import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingBentoComponent } from './landing-bento.component';

describe('LandingBentoComponent', () => {
  it('renders the heading and five tiles, each with its own heading', async () => {
    const fixture = await createTranslated(LandingBentoComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h2')?.textContent?.trim()).toBe('Save once, find in seconds');
    expect(root.querySelectorAll('article')).toHaveLength(5);
    expect(Array.from(root.querySelectorAll('h3'), (h) => h.textContent?.trim())).toEqual([
      'The preview fills in by itself',
      'Folders inside folders',
      'Find it by any word',
      'Save from your phone',
      'Your links stay yours',
    ]);
  });

  it('hides the decorative pictures from assistive technology', async () => {
    const fixture = await createTranslated(LandingBentoComponent);
    const root = fixture.nativeElement as HTMLElement;

    const demos = root.querySelectorAll(
      '.landing-bento__demo, .landing-bento__tree, .landing-bento__tokens',
    );
    expect(demos).toHaveLength(3);
    demos.forEach((el) => expect(el.getAttribute('aria-hidden')).toBe('true'));
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingBentoComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
