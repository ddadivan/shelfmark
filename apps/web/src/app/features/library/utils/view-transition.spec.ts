import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReducedMotion } from '@shelfmark/ui';
import { nameOnlyVisible, runViewTransition, VIEW_TRANSITION_CLIP_NAME } from './view-transition';

/** A document with `matchMedia`; `reduced` turns the Animations setting Reduced on (`ReducedMotion`). */
function fakeDoc(reduced: boolean, withApi: boolean): Document {
  TestBed.inject(ReducedMotion).setAppReduced(reduced);
  const doc = {
    visibilityState: 'visible',
    defaultView: { matchMedia: () => ({ matches: false }) },
    startViewTransition: vi.fn((callback: () => Promise<void>) => {
      void callback();
      return {
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        finished: Promise.resolve(),
      };
    }),
  };
  if (!withApi) {
    // @ts-expect-error simulating a browser without the API
    delete doc.startViewTransition;
  }
  return doc as unknown as Document;
}

describe('runViewTransition', () => {
  it('runs the update at once while the tab is hidden', () => {
    const doc = fakeDoc(false, true);
    Object.assign(doc, { visibilityState: 'hidden' });
    const update = vi.fn();
    runViewTransition(doc, TestBed.inject(Injector), update);
    expect(update).toHaveBeenCalledTimes(1);
    expect(doc.startViewTransition).not.toHaveBeenCalled();
  });

  it('runs the update inside startViewTransition when supported', () => {
    const doc = fakeDoc(false, true);
    const update = vi.fn();
    runViewTransition(doc, TestBed.inject(Injector), update);
    expect(doc.startViewTransition).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('only runs the update with reduced motion', () => {
    const doc = fakeDoc(true, true);
    const update = vi.fn();
    runViewTransition(doc, TestBed.inject(Injector), update);
    expect(doc.startViewTransition).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('only runs the update without browser support', () => {
    const update = vi.fn();
    runViewTransition(fakeDoc(false, false), TestBed.inject(Injector), update);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('keeps the names on only while the transition runs', async () => {
    const doc = fakeDoc(false, true);
    const injector = TestBed.inject(Injector);
    const names = { on: vi.fn(), off: vi.fn() };
    runViewTransition(doc, injector, vi.fn(), names);
    expect(names.on).toHaveBeenCalledTimes(1);
    TestBed.tick();
    expect(doc.startViewTransition).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(names.off).toHaveBeenCalledTimes(1);
  });

  it('makes the clip area the parent group while it runs, when the browser nests groups', async () => {
    const doc = fakeDoc(false, true) as unknown as { defaultView: Record<string, unknown> };
    doc.defaultView['CSS'] = { supports: () => true };
    const area = document.createElement('div');
    let during = '';
    const names = {
      on: vi.fn(),
      off: vi.fn(),
      clip: () => area,
    };
    const injector = TestBed.inject(Injector);
    runViewTransition(
      doc as unknown as Document,
      injector,
      () => {
        during = area.style.getPropertyValue('view-transition-name');
      },
      names,
    );
    TestBed.tick();
    await Promise.resolve();
    TestBed.tick();
    expect(during).toBe(VIEW_TRANSITION_CLIP_NAME);
    expect(area.style.getPropertyValue('view-transition-group')).toBe('');
    expect(area.style.getPropertyValue('view-transition-name')).toBe('');
  });

  it('does not turn the names on when it does not animate', () => {
    const names = { on: vi.fn(), off: vi.fn() };
    runViewTransition(fakeDoc(true, true), TestBed.inject(Injector), vi.fn(), names);
    expect(names.on).not.toHaveBeenCalled();
  });
});

describe('nameOnlyVisible', () => {
  function box(top: number, height: number): () => DOMRect {
    return () => new DOMRect(0, top, 300, height);
  }

  it('keeps only the names of the items wholly inside the area', () => {
    const area = document.createElement('div');
    area.getBoundingClientRect = box(100, 400);
    const items = [-200, 50, 150, 300, 450, 600].map((top, index) => {
      const item = document.createElement('div');
      item.style.setProperty('view-transition-name', `link-${index}`);
      item.getBoundingClientRect = box(top, 100);
      area.append(item);
      return item;
    });
    nameOnlyVisible(area);
    expect(items.map((item) => item.style.getPropertyValue('view-transition-name'))).toEqual([
      'none',
      'none',
      'link-2',
      'link-3',
      'none',
      'none',
    ]);
  });

  it('does nothing without an area', () => {
    expect(() => nameOnlyVisible(null)).not.toThrow();
  });
});
