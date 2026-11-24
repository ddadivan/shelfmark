import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import {
  MockIntersectionObserver,
  stubReducedMotion,
} from '../../../../../testing/mock-intersection-observer';
import { LandingBeforeAfterComponent } from './landing-before-after.component';

describe('LandingBeforeAfterComponent', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('draws the scattered collage and the same links on one shelf, both as named pictures', async () => {
    const fixture = await createTranslated(LandingBeforeAfterComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h2')?.textContent?.trim()).toBe('The same links, before and after');
    const labels = Array.from(root.querySelectorAll('[role="img"]'), (picture) =>
      picture.getAttribute('aria-label'),
    );
    expect(labels).toEqual([
      expect.stringContaining('scattered'),
      expect.stringContaining('one shelf'),
    ]);
    expect(root.querySelectorAll('.landing-ba__note')).toHaveLength(5);
    expect(root.querySelector('.landing-ba__row--on')?.textContent).toContain('Shopping');
    expect(Array.from(root.querySelectorAll('.landing-ba__name'), (n) => n.textContent)).toEqual([
      'The Ojai Jacket in Topsoil',
      'Tree Runners – Thunder Green',
      'The Crater Shirt in Denver Plaid',
      'Tree Dasher 2 – Natural White',
    ]);
  });

  it('lets the shelf rows slide in one by one, from 300 ms in 120 ms steps', async () => {
    stubReducedMotion(false);
    MockIntersectionObserver.install();
    const fixture = await createTranslated(LandingBeforeAfterComponent);
    await fixture.whenStable();
    const links = (fixture.nativeElement as HTMLElement).querySelector('.landing-ba__links');
    const observer = MockIntersectionObserver.instances.find((instance) =>
      instance.observed.includes(links as Element),
    );

    observer?.trigger(false);
    await fixture.whenStable();

    expect(links?.classList.contains('landing-reveal--pending')).toBe(true);
    const delays = Array.from(links?.children ?? [], (row) =>
      (row as HTMLElement).style.getPropertyValue('--landing-reveal-delay'),
    );
    expect(delays).toEqual(['300ms', '420ms', '540ms', '660ms']);
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingBeforeAfterComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
