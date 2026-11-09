import { afterEach, beforeEach, vi } from 'vitest';
import {
  MockIntersectionObserver,
  setTabState,
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
      setTabState(true);
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
      setTabState(false);
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

    it('plays the cycle once, ends on Clothes and starts no timer afterwards', async () => {
      const { fixture, activeRow, show } = await start();
      fixture.detectChanges();
      show(true);

      await vi.advanceTimersByTimeAsync(STEP_MS * 3);
      fixture.detectChanges();
      expect(activeRow()).toBe('Clothes');
      expect(vi.getTimerCount()).toBe(0);

      await vi.advanceTimersByTimeAsync(STEP_MS * 6);
      fixture.detectChanges();
      expect(activeRow()).toBe('Clothes');
      expect(vi.getTimerCount()).toBe(0);
    });

    it('has no pause control and ignores the pointer and focus', async () => {
      const { fixture, activeRow, show } = await start();
      fixture.detectChanges();
      show(true);
      const root = fixture.nativeElement as HTMLElement;
      const scenes = root.querySelector('.landing-ba__scenes') as HTMLElement;

      expect(root.querySelector('button')).toBeNull();
      expect(root.textContent).not.toContain('Pause');
      scenes.dispatchEvent(new Event('pointerenter'));
      scenes.dispatchEvent(new Event('focusin'));
      await vi.advanceTimersByTimeAsync(STEP_MS);
      fixture.detectChanges();

      expect(activeRow()).toBe('Angular');
    });
  });
});
