import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingBentoComponent } from './landing-bento.component';

describe('LandingBentoComponent', () => {
  it('is the #works target with the heading and five tiles, each with its own heading', async () => {
    const fixture = await createTranslated(LandingBentoComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('#works')?.getAttribute('tabindex')).toBe('-1');
    expect(root.querySelector('h2')?.textContent?.trim()).toBe('Save once, find in seconds');
    expect(root.querySelectorAll('.landing-bento__tile')).toHaveLength(5);
    expect(Array.from(root.querySelectorAll('h3'), (h) => h.textContent?.trim())).toEqual([
      'The preview fills in by itself',
      'Folders inside folders',
      'Find it by any word',
      'Save from your phone',
      'Your links stay yours',
    ]);
  });

  it('hides the small drawings from assistive technology and marks the search word', async () => {
    const fixture = await createTranslated(LandingBentoComponent);
    const root = fixture.nativeElement as HTMLElement;

    const visuals = root.querySelectorAll('.landing-bento__visual');
    expect(visuals).toHaveLength(5);
    visuals.forEach((el) => expect(el.getAttribute('aria-hidden')).toBe('true'));
    expect(root.querySelector('mark')?.textContent).toBe('Jacket');
    expect(Array.from(root.querySelectorAll('.landing-bento__file'), (f) => f.textContent)).toEqual(
      ['JSON', 'Bookmarks HTML', 'CSV'],
    );
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingBentoComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
