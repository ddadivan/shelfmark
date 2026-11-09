import { afterEach, beforeEach, vi } from 'vitest';
import {
  MockIntersectionObserver,
  setTabState,
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

  describe('entrance', () => {
    const ARMED = 'landing-before__before--armed';
    const ENTERED = 'landing-before__before--entered';

    beforeEach(() => {
      MockIntersectionObserver.install();
      stubReducedMotion(false);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      setTabState(true);
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

    it('waits out of sight until it is in the viewport', async () => {
      const { el } = await board();

      expect(el.classList.contains(ARMED)).toBe(true);
      expect(el.classList.contains(ENTERED)).toBe(false);
    });

    it('plays the entrance once when it comes into view and never again', async () => {
      const { fixture, el } = await board();

      MockIntersectionObserver.triggerAll(true);
      fixture.detectChanges();
      expect(el.classList.contains(ENTERED)).toBe(true);
      expect(el.classList.contains(ARMED)).toBe(false);

      MockIntersectionObserver.triggerAll(false);
      fixture.detectChanges();
      MockIntersectionObserver.triggerAll(true);
      fixture.detectChanges();
      expect(el.classList.contains(ENTERED)).toBe(true);
      expect(el.classList.contains(ARMED)).toBe(false);
    });

    it('does not start in a hidden tab', async () => {
      setTabState(false);
      const { fixture, el } = await board();

      MockIntersectionObserver.triggerAll(true);
      fixture.detectChanges();
      expect(el.classList.contains(ENTERED)).toBe(false);

      setTabState(true);
      fixture.detectChanges();
      expect(el.classList.contains(ENTERED)).toBe(true);
    });

    it('stays the static frame under reduced motion', async () => {
      stubReducedMotion(true);
      const { fixture, el } = await board();

      expect(el.classList.contains(ARMED)).toBe(false);
      MockIntersectionObserver.triggerAll(true);
      fixture.detectChanges();

      expect(el.classList.contains(ARMED)).toBe(false);
    });

    it('has no hover or ping behaviour left: no live class and no input to pause it', async () => {
      const { el } = await board();

      expect(el.className).not.toContain('--live');
    });

    it('disconnects its observer on destroy', async () => {
      const { fixture } = await board();

      fixture.destroy();

      expect(MockIntersectionObserver.instances.every((o) => o.disconnected)).toBe(true);
    });
  });
});
