import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { PROGRESS_BAR_DONE_TIMEOUT_MS } from './models/progress-bar-done-timeout.const';
import { PROGRESS_BAR_DONE_ANIMATION } from './models/progress-bar-done-animation.const';
import type { ProgressBarVariant } from './models/progress-bar-variant.type';
import { ProgressBarComponent } from './progress-bar.component';

function setup(inputs: { variant?: ProgressBarVariant; label?: string } = {}) {
  const fixture = TestBed.createComponent(ProgressBarComponent);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  const host = fixture.nativeElement as HTMLElement;
  const bar = () => host.querySelector('.ui-progress') as HTMLElement | null;
  const update = (active: boolean): void => {
    fixture.componentRef.setInput('active', active);
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
  };
  const endAnimation = (animationName: string): void => {
    const event = new Event('animationend', { bubbles: true });
    Object.defineProperty(event, 'animationName', { value: animationName });
    bar()?.dispatchEvent(event);
    fixture.detectChanges();
  };
  fixture.detectChanges();
  return { fixture, host, bar, update, endAnimation };
}

describe('ProgressBarComponent', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders nothing while idle', () => {
    const { bar } = setup();
    expect(bar()).toBeNull();
  });

  describe('fixed', () => {
    it('appears only after 300 ms of waiting', () => {
      const { bar, update, fixture } = setup();
      update(true);
      vi.advanceTimersByTime(299);
      fixture.detectChanges();
      expect(bar()).toBeNull();

      vi.advanceTimersByTime(1);
      TestBed.tick();
      fixture.detectChanges();
      expect(bar()).not.toBeNull();
      expect(bar()?.classList.contains('ui-progress--fixed')).toBe(true);
      expect(bar()?.classList.contains('ui-progress--done')).toBe(false);
    });

    it('never appears for a request faster than 300 ms', () => {
      const { bar, update, fixture } = setup();
      update(true);
      vi.advanceTimersByTime(200);
      update(false);
      vi.advanceTimersByTime(2000);
      fixture.detectChanges();
      expect(bar()).toBeNull();
    });

    it('fills and fades when the request ends, and leaves the DOM when the fade ends', () => {
      const { bar, update, fixture, endAnimation } = setup();
      update(true);
      vi.advanceTimersByTime(300);
      TestBed.tick();
      fixture.detectChanges();
      update(false);
      expect(bar()?.classList.contains('ui-progress--done')).toBe(true);

      endAnimation('ui-reveal');
      expect(bar()).not.toBeNull();

      endAnimation(PROGRESS_BAR_DONE_ANIMATION);
      expect(bar()).toBeNull();
    });

    it('leaves the DOM when the fade is cancelled, ignoring a cancelled enter animation', () => {
      const { bar, update, fixture, host } = setup();
      update(true);
      vi.advanceTimersByTime(300);
      TestBed.tick();
      fixture.detectChanges();
      update(false);
      const cancel = (animationName: string): void => {
        const event = new Event('animationcancel', { bubbles: true });
        Object.defineProperty(event, 'animationName', { value: animationName });
        bar()?.dispatchEvent(event);
        fixture.detectChanges();
      };
      cancel('ui-reveal');
      expect(host.querySelector('.ui-progress')).not.toBeNull();
      cancel(PROGRESS_BAR_DONE_ANIMATION);
      expect(bar()).toBeNull();
    });

    it('removes a finished bar by timer when no animation event arrives', () => {
      const { bar, update, fixture } = setup();
      update(true);
      vi.advanceTimersByTime(300);
      TestBed.tick();
      fixture.detectChanges();
      update(false);
      vi.advanceTimersByTime(PROGRESS_BAR_DONE_TIMEOUT_MS - 1);
      fixture.detectChanges();
      expect(bar()).not.toBeNull();
      vi.advanceTimersByTime(1);
      TestBed.tick();
      fixture.detectChanges();
      expect(bar()).toBeNull();
    });

    it('runs again when a request starts while the bar is finishing', () => {
      const { bar, update, fixture } = setup();
      update(true);
      vi.advanceTimersByTime(300);
      TestBed.tick();
      fixture.detectChanges();
      update(false);
      expect(bar()?.classList.contains('ui-progress--done')).toBe(true);

      update(true);
      vi.advanceTimersByTime(300);
      TestBed.tick();
      fixture.detectChanges();
      expect(bar()?.classList.contains('ui-progress--done')).toBe(false);
    });
  });

  describe('inline', () => {
    it('shows at once, without the 300 ms delay', () => {
      const { bar, update } = setup({ variant: 'inline' });
      update(true);
      expect(bar()?.classList.contains('ui-progress--inline')).toBe(true);
      expect(bar()?.classList.contains('ui-progress--fixed')).toBe(false);
    });

    it('finishes like the fixed bar', () => {
      const { bar, update, endAnimation } = setup({ variant: 'inline' });
      update(true);
      update(false);
      expect(bar()?.classList.contains('ui-progress--done')).toBe(true);
      endAnimation(PROGRESS_BAR_DONE_ANIMATION);
      expect(bar()).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('is aria-hidden without a label', () => {
      const { bar, update } = setup({ variant: 'inline' });
      update(true);
      expect(bar()?.getAttribute('aria-hidden')).toBe('true');
      expect(bar()?.hasAttribute('role')).toBe(false);
    });

    it('is an indeterminate progressbar with a label', () => {
      const { bar, update } = setup({ variant: 'inline', label: 'Loading Shelfmark' });
      update(true);
      expect(bar()?.getAttribute('role')).toBe('progressbar');
      expect(bar()?.getAttribute('aria-label')).toBe('Loading Shelfmark');
      expect(bar()?.hasAttribute('aria-valuenow')).toBe(false);
      expect(bar()?.hasAttribute('aria-hidden')).toBe(false);
    });

    it('has no axe violations, with and without a label', async () => {
      vi.useRealTimers();
      const plain = setup({ variant: 'inline' });
      plain.update(true);
      expect(await axeViolations(plain.host)).toEqual([]);

      const named = setup({ variant: 'inline', label: 'Loading Shelfmark' });
      named.update(true);
      expect(await axeViolations(named.host)).toEqual([]);
    });
  });
});
