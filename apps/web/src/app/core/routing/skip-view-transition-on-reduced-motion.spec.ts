import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import type { ViewTransitionInfo } from '@angular/router';
import { skipViewTransitionOnReducedMotion } from './skip-view-transition-on-reduced-motion';

function setup(reduced: boolean | null) {
  const doc = {
    defaultView: reduced === null ? {} : { matchMedia: () => ({ matches: reduced }) },
  } as unknown as Document;
  TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: doc }] });
  const skipTransition = vi.fn();
  const info = { transition: { skipTransition } } as unknown as ViewTransitionInfo;
  TestBed.runInInjectionContext(() => skipViewTransitionOnReducedMotion(info));
  return skipTransition;
}

describe('skipViewTransitionOnReducedMotion', () => {
  it('skips the page transition with prefers-reduced-motion', () => {
    expect(setup(true)).toHaveBeenCalledTimes(1);
  });

  it('lets the cross-fade run otherwise', () => {
    expect(setup(false)).not.toHaveBeenCalled();
  });

  it('skips it when the media query cannot be read', () => {
    expect(setup(null)).toHaveBeenCalledTimes(1);
  });
});
