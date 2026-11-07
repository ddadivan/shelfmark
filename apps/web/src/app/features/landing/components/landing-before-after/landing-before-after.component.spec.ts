import { afterEach, beforeEach, vi } from 'vitest';
import {
  MockIntersectionObserver,
  stubReducedMotion,
} from '../../../../../testing/mock-intersection-observer';
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

  describe('shelf loop', () => {
    const STEP_MS = 3000;

    beforeEach(() => {
      MockIntersectionObserver.install();
      stubReducedMotion(false);
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    });

    async function start() {
      const fixture = await createTranslated(LandingBeforeAfterComponent);
      vi.useFakeTimers();
      const root = fixture.nativeElement as HTMLElement;
      const activeRow = () => root.querySelector('.landing-ba__row--active')?.textContent?.trim();
      const firstTitle = () => root.querySelector('.landing-ba__item-title')?.textContent?.trim();
      const show = (visible: boolean) => {
        MockIntersectionObserver.triggerAll(visible);
        fixture.detectChanges();
      };
      return { fixture, activeRow, firstTitle, show };
    }

    it('stays on the static frame until the block is in the viewport', async () => {
      const { fixture, activeRow } = await start();
      fixture.detectChanges();

      await vi.advanceTimersByTimeAsync(STEP_MS * 3);

      expect(activeRow()).toBe('Clothes');
    });

    it('cycles Clothes, Angular, Recipes and back every 3 s (9 s loop)', async () => {
      const { fixture, activeRow, firstTitle, show } = await start();
      fixture.detectChanges();
      show(true);

      const seen: (string | undefined)[] = [activeRow()];
      for (let step = 0; step < 3; step++) {
        await vi.advanceTimersByTimeAsync(STEP_MS);
        fixture.detectChanges();
        seen.push(activeRow());
      }

      expect(seen).toEqual(['Clothes', 'Angular', 'Recipes', 'Clothes']);
      expect(firstTitle()).toBe('Wool coat, graphite');
    });

    it('pauses when the block leaves the viewport and resumes where it stopped', async () => {
      const { fixture, activeRow, show } = await start();
      fixture.detectChanges();
      show(true);
      await vi.advanceTimersByTimeAsync(STEP_MS);
      fixture.detectChanges();
      show(false);

      await vi.advanceTimersByTimeAsync(STEP_MS * 5);
      expect(activeRow()).toBe('Angular');
      expect(vi.getTimerCount()).toBe(0);

      show(true);
      await vi.advanceTimersByTimeAsync(STEP_MS);
      fixture.detectChanges();
      expect(activeRow()).toBe('Recipes');
    });

    it('pauses in a hidden tab', async () => {
      const { fixture, activeRow, show } = await start();
      fixture.detectChanges();
      show(true);
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      fixture.detectChanges();

      await vi.advanceTimersByTimeAsync(STEP_MS * 3);

      expect(activeRow()).toBe('Clothes');
      expect(vi.getTimerCount()).toBe(0);
    });

    it('starts no timer under reduced motion and keeps the static frame', async () => {
      stubReducedMotion(true);
      const { fixture, activeRow, show } = await start();
      fixture.detectChanges();
      show(true);

      await vi.advanceTimersByTimeAsync(STEP_MS * 3);

      expect(vi.getTimerCount()).toBe(0);
      expect(activeRow()).toBe('Clothes');
    });

    it('clears its timer and observer on destroy', async () => {
      const { fixture, show } = await start();
      fixture.detectChanges();
      show(true);
      expect(vi.getTimerCount()).toBe(1);

      fixture.destroy();

      expect(vi.getTimerCount()).toBe(0);
      expect(MockIntersectionObserver.instances.every((o) => o.disconnected)).toBe(true);
    });

    describe('pause control (WCAG 2.2.2)', () => {
      it('pauses the cycle on press and resumes on the next press', async () => {
        const { fixture, activeRow, show } = await start();
        fixture.detectChanges();
        show(true);
        const button = (fixture.nativeElement as HTMLElement).querySelector(
          '.landing-ba__pause button',
        ) as HTMLButtonElement;
        expect(button.getAttribute('aria-pressed')).toBe('false');

        button.click();
        fixture.detectChanges();
        expect(button.getAttribute('aria-pressed')).toBe('true');
        await vi.advanceTimersByTimeAsync(STEP_MS * 3);
        expect(activeRow()).toBe('Clothes');
        expect(vi.getTimerCount()).toBe(0);

        button.click();
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(STEP_MS);
        fixture.detectChanges();
        expect(activeRow()).toBe('Angular');
      });

      it('pauses while the pointer or focus is inside the scenes', async () => {
        const { fixture, activeRow, show } = await start();
        fixture.detectChanges();
        show(true);
        const scenes = (fixture.nativeElement as HTMLElement).querySelector(
          '.landing-ba__scenes',
        ) as HTMLElement;

        scenes.dispatchEvent(new Event('pointerenter'));
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(STEP_MS * 2);
        expect(activeRow()).toBe('Clothes');

        scenes.dispatchEvent(new Event('pointerleave'));
        scenes.dispatchEvent(new Event('focusin'));
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(STEP_MS * 2);
        expect(activeRow()).toBe('Clothes');

        scenes.dispatchEvent(new Event('focusout'));
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(STEP_MS);
        fixture.detectChanges();
        expect(activeRow()).toBe('Angular');
      });

      it('is hidden under reduced motion', async () => {
        stubReducedMotion(true);
        const { fixture } = await start();
        fixture.detectChanges();

        expect(
          (fixture.nativeElement as HTMLElement).querySelector('.landing-ba__pause'),
        ).toBeNull();
      });
    });
  });
});
