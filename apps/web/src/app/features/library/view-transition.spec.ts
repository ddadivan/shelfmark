import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { runViewTransition } from './view-transition';

function fakeDoc(reduced: boolean, withApi: boolean): Document {
  const doc = {
    defaultView: { matchMedia: () => ({ matches: reduced }) },
    startViewTransition: vi.fn((callback: () => Promise<void>) => void callback()),
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
});
