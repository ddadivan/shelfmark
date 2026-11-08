import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingBuiltComponent } from './landing-built.component';

describe('LandingBuiltComponent', () => {
  it('is the #how anchor target with eight agent roles', async () => {
    const fixture = await createTranslated(LandingBuiltComponent);
    const root = fixture.nativeElement as HTMLElement;

    // One element carries the id (the focusable section), never the host as well.
    expect(root.id).not.toBe('how');
    expect(root.querySelectorAll('#how')).toHaveLength(1);
    expect(root.querySelector('#how')?.getAttribute('tabindex')).toBe('-1');
    expect(root.querySelector('h2')?.textContent?.trim()).toBe("How it's built");
    expect(root.querySelectorAll('.landing-built__agent')).toHaveLength(8);
    expect(root.textContent).toContain('security-reviewer');
  });

  it('links to the repository and the decision log in new tabs with noopener', async () => {
    const fixture = await createTranslated(LandingBuiltComponent);
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a'),
    );

    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      'https://github.com/ddadivan/shelfmark',
      'https://github.com/ddadivan/shelfmark/tree/main/docs/adr',
    ]);
    for (const link of links) {
      expect(link.target).toBe('_blank');
      expect(link.rel).toContain('noopener');
    }
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingBuiltComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
