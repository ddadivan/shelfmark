import { afterEach, beforeEach, vi } from 'vitest';
import {
  MockIntersectionObserver,
  stubReducedMotion,
} from '../../../../../testing/mock-intersection-observer';
import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingBeforeSceneComponent } from './landing-before-scene.component';

describe('LandingBeforeSceneComponent', () => {
  it('describes the scattered links as one named image', async () => {
    const fixture = await createTranslated(LandingBeforeSceneComponent);
    const board = (fixture.nativeElement as HTMLElement).querySelector('[role="img"]');

    expect(board?.getAttribute('aria-label')).toContain('scattered across Saved Messages');
    expect(board?.textContent).toContain('Bookmarks bar (91)');
  });

  it('has no axe violations', async () => {
    const fixture = await createTranslated(LandingBeforeSceneComponent);

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });

  describe('loops', () => {
    const LIVE = 'landing-before__before--live';

    beforeEach(() => {
      MockIntersectionObserver.install();
      stubReducedMotion(false);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    });

    async function board(): Promise<{
      fixture: Awaited<ReturnType<typeof createTranslated>>;
      el: Element;
    }> {
      const fixture = await createTranslated(LandingBeforeSceneComponent);
      fixture.detectChanges();
      return {
        fixture,
        el: (fixture.nativeElement as HTMLElement).querySelector('[role="img"]') as Element,
      };
    }

    it('is a static frame until it is in the viewport', async () => {
      const { el } = await board();

      expect(el.classList.contains(LIVE)).toBe(false);
    });

    it('drifts and pings while visible, and stops when it leaves or the tab hides', async () => {
      const { fixture, el } = await board();

      MockIntersectionObserver.triggerAll(true);
      fixture.detectChanges();
      expect(el.classList.contains(LIVE)).toBe(true);

      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      fixture.detectChanges();
      expect(el.classList.contains(LIVE)).toBe(false);

      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      MockIntersectionObserver.triggerAll(false);
      fixture.detectChanges();
      expect(el.classList.contains(LIVE)).toBe(false);
    });

    it('stays static under reduced motion', async () => {
      stubReducedMotion(true);
      const { fixture, el } = await board();

      MockIntersectionObserver.triggerAll(true);
      fixture.detectChanges();

      expect(el.classList.contains(LIVE)).toBe(false);
    });

    it('disconnects its observer on destroy', async () => {
      const { fixture } = await board();

      fixture.destroy();

      expect(MockIntersectionObserver.instances.every((o) => o.disconnected)).toBe(true);
    });
  });
});
