import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReducedMotion } from '@shelfmark/ui';
import { runViewTransition } from './view-transition';

/** A document with `matchMedia`; `reduced` turns the Animations setting Reduced on (`ReducedMotion`). */
function fakeDoc(reduced: boolean, withApi: boolean): Document {
  TestBed.inject(ReducedMotion).setAppReduced(reduced);
  const doc = {
    defaultView: { matchMedia: () => ({ matches: false }) },
    startViewTransition: vi.fn((callback: () => Promise<void>) => {
      void callback();
      return { finished: Promise.resolve() };
    }),
  };
  if (!withApi) {
    // @ts-expect-error simulating a browser without the API
    delete doc.startViewTransition;
  }
  return doc as unknown as Document;
}

describe('runViewTransition', () => {
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

  it('does not turn the names on when it does not animate', () => {
    const names = { on: vi.fn(), off: vi.fn() };
    runViewTransition(fakeDoc(true, true), TestBed.inject(Injector), vi.fn(), names);
    expect(names.on).not.toHaveBeenCalled();
  });
});
