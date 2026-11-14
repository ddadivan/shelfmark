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

  it('is a decorative, inert picture: a folder, library cards and a toast with Undo', async () => {
    const fixture = await createTranslated(LandingHeroPreviewComponent);
    const root = fixture.nativeElement as HTMLElement;
    const picture = root.querySelector('.landing-hero-preview');

    expect(picture?.getAttribute('aria-hidden')).toBe('true');
    expect(picture?.hasAttribute('inert')).toBe(true);
    expect(root.textContent).toContain('Read later');
    expect(root.textContent).toContain('21 links');
    expect(root.querySelector('ui-segmented-control')?.textContent).toContain('All 21');
    expect(root.querySelector('ui-segmented-control')?.textContent).toContain('Articles 6');
    expect(root.querySelectorAll('ui-card')).toHaveLength(4);
    expect(root.querySelectorAll('.ui-card__placeholder')).toHaveLength(4);
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

  describe('switch loop', () => {
    const slots = (root: HTMLElement) =>
      Array.from(root.querySelectorAll<HTMLElement>('.landing-hero-preview__item')).map((item) =>
        item.style.getPropertyValue('--landing-preview-slot'),
      );
    const checked = (root: HTMLElement) =>
      root.querySelector<HTMLInputElement>('ui-segmented-control input:checked')?.value;

    afterEach(() => vi.useRealTimers());

    async function seen(reduced = false) {
      stubReducedMotion(reduced);
      MockIntersectionObserver.install();
      const fixture = await createTranslated(LandingHeroPreviewComponent);
      await fixture.whenStable();
      vi.useFakeTimers();
      MockIntersectionObserver.triggerAll(true);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const advance = (ms: number) => {
        vi.advanceTimersByTime(ms);
        fixture.detectChanges();
      };
      return { fixture, root, advance };
    }

    it('slides from All to Articles and back while in view: the video leaves, the articles move one slot over', async () => {
      const { root, advance } = await seen();

      expect(checked(root)).toBe('all');
      expect(slots(root)).toEqual(['0', '1', '2', '3']);
      expect(root.textContent).toContain('21 links');

      advance(4200);
      expect(checked(root)).toBe('articles');
      expect(slots(root)).toEqual(['-1', '0', '1', '2']);
      expect(root.textContent).toContain('6 links');

      advance(3200);
      expect(checked(root)).toBe('all');
      expect(slots(root)).toEqual(['0', '1', '2', '3']);
    });

    it('waits where it is while the preview is out of view', async () => {
      const { root, advance } = await seen();
      MockIntersectionObserver.triggerAll(false);
      advance(20_000);

      expect(checked(root)).toBe('all');
      expect(slots(root)).toEqual(['0', '1', '2', '3']);
    });

    it('waits where it is while the tab is hidden', async () => {
      const { root, advance } = await seen();
      const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
      advance(20_000);

      expect(checked(root)).toBe('all');
      expect(slots(root)).toEqual(['0', '1', '2', '3']);
      visibility.mockRestore();
      document.dispatchEvent(new Event('visibilitychange'));
    });

    it('stays on the All frame under reduced motion', async () => {
      const { root, advance } = await seen(true);
      advance(20_000);

      expect(checked(root)).toBe('all');
      expect(slots(root)).toEqual(['0', '1', '2', '3']);
    });

    it('never moves focus: the switch is inside the inert picture', async () => {
      const { root, advance } = await seen();
      const before = document.activeElement;
      advance(4200);

      expect(document.activeElement).toBe(before);
      expect(root.querySelector('ui-segmented-control')?.closest('[inert]')).not.toBeNull();
    });
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingHeroPreviewComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
