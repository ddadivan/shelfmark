import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingBeforeAfterComponent } from './landing-before-after.component';

describe('LandingBeforeAfterComponent', () => {
  it('renders both scenes under an h2', async () => {
    const fixture = await createTranslated(LandingBeforeAfterComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h2')?.textContent).toContain('The same links, before and after');
    const labels = Array.from(root.querySelectorAll('h3')).map((h) => h.textContent?.trim());
    expect(labels).toEqual(['Before: scattered', 'After: on one shelf']);
    expect(root.textContent).toContain('Bookmarks bar (91)');
  });

  it('lists the links of the selected folder with their notes', async () => {
    const fixture = await createTranslated(LandingBeforeAfterComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('.landing-ba__item')).toHaveLength(3);
    expect(root.textContent).toContain('Wool coat, graphite');
    expect(root.textContent).toContain('Wait for the sale, size M');
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingBeforeAfterComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
