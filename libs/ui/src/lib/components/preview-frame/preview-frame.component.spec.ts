import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { compileScss } from '../../../testing/scss';
import { PREVIEW_FRAME_DEFAULT_TIMEOUT_MS } from './models/preview-frame-default-timeout.const';
import { PreviewFrameComponent } from './preview-frame.component';

const PAGE = 'https://example.com/article';

function setup(src = PAGE, timeoutMs?: number) {
  const fixture = TestBed.createComponent(PreviewFrameComponent);
  fixture.componentRef.setInput('src', src);
  fixture.componentRef.setInput('title', 'Preview of Example');
  if (timeoutMs !== undefined) {
    fixture.componentRef.setInput('timeoutMs', timeoutMs);
  }
  const events = { loaded: 0, timedOut: 0, rejected: 0 };
  fixture.componentInstance.loaded.subscribe(() => events.loaded++);
  fixture.componentInstance.timedOut.subscribe(() => events.timedOut++);
  fixture.componentInstance.rejected.subscribe(() => events.rejected++);
  const el = fixture.nativeElement as HTMLElement;
  const iframe = () => el.querySelector('iframe') as HTMLIFrameElement;
  const progress = () => el.querySelector('.ui-progress');
  const flush = () => {
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
  };
  flush();
  return { fixture, el, iframe, progress, events, flush };
}

describe('ui-preview-frame', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('gives the iframe a valid src and the fixed safety attributes', () => {
    const { iframe } = setup();
    expect(iframe().getAttribute('src')).toBe(PAGE);
    expect(iframe().getAttribute('sandbox')).toBe(
      'allow-scripts allow-same-origin allow-popups allow-forms',
    );
    expect(iframe().getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(iframe().getAttribute('allow')).toBe('fullscreen; picture-in-picture; encrypted-media');
    expect(iframe().getAttribute('loading')).toBe('eager');
    expect(iframe().getAttribute('title')).toBe('Preview of Example');
  });

  it('never gives the iframe an invalid src and emits rejected', () => {
    for (const bad of ['http://example.com', 'javascript:alert(1)', 'data:text/html,x', 'x']) {
      const { iframe, events } = setup(bad);
      expect(iframe().hasAttribute('src')).toBe(false);
      expect(iframe().hidden).toBe(true);
      expect(events.rejected).toBe(1);
      expect(events.timedOut).toBe(0);
    }
  });

  it('rejects the app origin', () => {
    const { iframe, events } = setup(`${location.origin}/x`);
    expect(iframe().hasAttribute('src')).toBe(false);
    expect(events.rejected).toBe(1);
  });

  it('replaces a frame that showed a page with an empty one when src turns invalid', () => {
    const { fixture, iframe, flush, events } = setup();
    const first = iframe();
    fixture.componentRef.setInput('src', 'javascript:alert(1)');
    flush();
    expect(iframe()).not.toBe(first);
    expect(iframe().hasAttribute('src')).toBe(false);
    expect(iframe().hidden).toBe(true);
    expect(events.rejected).toBe(1);
  });

  it('shows the progress bar while loading and hides it once loaded', () => {
    const { fixture, el, iframe, progress, events, flush } = setup();
    vi.advanceTimersByTime(1);
    expect(progress()).not.toBeNull();
    expect(el.querySelector('.ui-preview-frame')?.getAttribute('aria-busy')).toBe('true');

    iframe().dispatchEvent(new Event('load'));
    flush();
    expect(events.loaded).toBe(1);
    expect(el.querySelector('.ui-preview-frame')?.getAttribute('aria-busy')).toBe('false');
    // The bar fills and fades, then is removed; its fallback timer removes it without animation.
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(progress()).toBeNull();

    iframe().dispatchEvent(new Event('load'));
    expect(events.loaded).toBe(1);
  });

  it('emits timedOut once after timeoutMs and not after a load', () => {
    const { iframe, events } = setup(PAGE, 5000);
    vi.advanceTimersByTime(4999);
    expect(events.timedOut).toBe(0);
    vi.advanceTimersByTime(1);
    expect(events.timedOut).toBe(1);
    vi.advanceTimersByTime(20000);
    expect(events.timedOut).toBe(1);
    expect(iframe().getAttribute('src')).toBe(PAGE);

    const other = setup(PAGE, 5000);
    other.iframe().dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(10000);
    expect(other.events.timedOut).toBe(0);
  });

  it('uses 10 s by default and no timeout at 0', () => {
    const { events } = setup();
    vi.advanceTimersByTime(PREVIEW_FRAME_DEFAULT_TIMEOUT_MS - 1);
    expect(events.timedOut).toBe(0);
    vi.advanceTimersByTime(1);
    expect(events.timedOut).toBe(1);

    const off = setup(PAGE, 0);
    vi.advanceTimersByTime(60000);
    expect(off.events.timedOut).toBe(0);
  });

  it('restarts loading and the timeout when src changes', () => {
    const { fixture, iframe, flush, events, el } = setup(PAGE, 5000);
    iframe().dispatchEvent(new Event('load'));
    flush();
    expect(events.loaded).toBe(1);

    vi.advanceTimersByTime(4000);
    const first = iframe();
    fixture.componentRef.setInput('src', 'https://example.org/next');
    flush();
    // A fresh iframe, so the switch adds no browser history entry.
    expect(iframe()).not.toBe(first);
    expect(iframe().getAttribute('src')).toBe('https://example.org/next');
    expect(el.querySelector('.ui-preview-frame')?.getAttribute('aria-busy')).toBe('true');
    vi.advanceTimersByTime(4999);
    expect(events.timedOut).toBe(0);
    vi.advanceTimersByTime(1);
    expect(events.timedOut).toBe(1);
    iframe().dispatchEvent(new Event('load'));
    expect(events.loaded).toBe(2);
  });

  it('clears the timer on destroy', () => {
    const { fixture, events } = setup(PAGE, 5000);
    fixture.destroy();
    vi.advanceTimersByTime(10000);
    expect(events.timedOut).toBe(0);
  });

  it('has no native tooltip on the host and passes axe', async () => {
    const { el } = setup();
    expect(el.hasAttribute('title')).toBe(false);
    vi.useRealTimers();
    // `iframes: false`: axe cannot message a frame in jsdom; the frame element itself is checked
    // (`frame-title`), not the page inside it.
    const results = await axe.run(el, {
      iframes: false,
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  it('draws the page on the frame canvas token', () => {
    const css = compileScss('lib/components/preview-frame/preview-frame.component.scss');
    expect(css).toContain('var(--frame-canvas)');
  });
});
