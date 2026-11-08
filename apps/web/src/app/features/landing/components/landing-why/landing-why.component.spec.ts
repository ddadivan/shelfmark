import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingWhyComponent } from './landing-why.component';

describe('LandingWhyComponent', () => {
  it('renders the author quote with its heading', async () => {
    const fixture = await createTranslated(LandingWhyComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h2')?.textContent).toBe('Why this exists');
    expect(root.querySelector('blockquote')?.textContent).toContain(
      'So I built the shelf I wanted.',
    );
    expect(root.querySelector('figcaption')?.textContent).toContain('Dmytro');
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingWhyComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
