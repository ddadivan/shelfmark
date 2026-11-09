import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingFinaleComponent } from './landing-finale.component';

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
});
