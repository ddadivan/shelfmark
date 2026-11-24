import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingExtensionComponent } from './landing-extension.component';

describe('LandingExtensionComponent', () => {
  it('shows the popup in a browser frame, the folder from a rule and no install link (#455)', async () => {
    const fixture = await createTranslated(LandingExtensionComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h2')?.textContent?.trim()).toBe('Save the page you are on');
    expect(root.textContent).toContain('For Chrome, Edge, Brave and Arc.');
    const frame = root.querySelector('.landing-extension__browser');
    expect(frame?.getAttribute('role')).toBe('img');
    expect(frame?.getAttribute('aria-label')).toContain('The Shelfmark extension');
    expect(root.querySelector('.landing-extension__rule')?.textContent).toContain('Shopping');
    expect(root.querySelector('a')).toBeNull();
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingExtensionComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
