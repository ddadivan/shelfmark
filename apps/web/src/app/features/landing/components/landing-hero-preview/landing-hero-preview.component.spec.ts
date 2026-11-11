import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import {
  MockIntersectionObserver,
  stubReducedMotion,
} from '../../../../../testing/mock-intersection-observer';
import { LandingHeroPreviewComponent } from './landing-hero-preview.component';

describe('LandingHeroPreviewComponent', () => {
  beforeEach(() => stubReducedMotion(false));

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is a decorative, inert picture: a folder, three library cards and a toast with Undo', async () => {
    const fixture = await createTranslated(LandingHeroPreviewComponent);
    const root = fixture.nativeElement as HTMLElement;
    const picture = root.querySelector('.landing-hero-preview');

    expect(picture?.getAttribute('aria-hidden')).toBe('true');
    expect(picture?.hasAttribute('inert')).toBe(true);
    expect(root.textContent).toContain('Read later');
    expect(root.textContent).toContain('21 links');
    expect(root.querySelector('ui-segmented-control')?.textContent).toContain('All 21');
    expect(root.querySelector('ui-segmented-control')?.textContent).toContain('Articles 6');
    expect(root.querySelectorAll('ui-card')).toHaveLength(3);
    expect(root.querySelectorAll('.ui-card__placeholder')).toHaveLength(3);
    expect(root.querySelector('ui-toast')?.textContent).toContain('Saved to Read later');
    expect(root.querySelector('ui-toast')?.textContent).toContain('Undo');
    expect(root.textContent).toContain('web.dev');
    expect(root.querySelector('a[href]')).toBeNull();
  });

  it('holds the parts invisible until it is seen, then plays once and never again', async () => {
    MockIntersectionObserver.install();
    const fixture = await createTranslated(LandingHeroPreviewComponent);
    const root = fixture.nativeElement as HTMLElement;
    const picture = root.querySelector('.landing-hero-preview');
    await fixture.whenStable();

    expect(picture?.classList.contains('landing-hero-preview--waiting')).toBe(true);

    MockIntersectionObserver.triggerAll(true);
    await fixture.whenStable();
    expect(picture?.classList.contains('landing-hero-preview--playing')).toBe(true);
    expect(picture?.classList.contains('landing-hero-preview--waiting')).toBe(false);

    MockIntersectionObserver.triggerAll(false);
    await fixture.whenStable();
    expect(picture?.classList.contains('landing-hero-preview--playing')).toBe(true);
  });

  it('never waits under reduced motion: the final frame is simply there', async () => {
    stubReducedMotion(true);
    MockIntersectionObserver.install();
    const fixture = await createTranslated(LandingHeroPreviewComponent);
    await fixture.whenStable();
    const picture = (fixture.nativeElement as HTMLElement).querySelector('.landing-hero-preview');

    expect(picture?.classList.contains('landing-hero-preview--waiting')).toBe(false);
    expect(picture?.classList.contains('landing-hero-preview--playing')).toBe(false);
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingHeroPreviewComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
