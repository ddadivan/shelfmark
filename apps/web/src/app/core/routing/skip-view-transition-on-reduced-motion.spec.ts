import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import type { ViewTransitionInfo } from '@angular/router';
import { ReducedMotion } from '@shelfmark/ui';
import { skipViewTransitionOnReducedMotion } from './skip-view-transition-on-reduced-motion';

function fakeTransition(skipTransition = vi.fn()) {
  return {
    skipTransition,
    ready: Promise.resolve(),
    updateCallbackDone: Promise.resolve(),
    finished: Promise.resolve(),
  };
}

function setup(
  reduced: boolean | null,
  visibilityState: DocumentVisibilityState = 'visible',
  routes: Partial<Pick<ViewTransitionInfo, 'from' | 'to'>> = {},
) {
  const doc = {
    visibilityState,
    defaultView:
      reduced === null
        ? {}
        : {
            matchMedia: () => ({
              matches: reduced,
              addEventListener: () => undefined,
              removeEventListener: () => undefined,
            }),
          },
  } as unknown as Document;
  TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: doc }] });
  const skipTransition = vi.fn();
  const info = {
    ...routes,
    transition: fakeTransition(skipTransition),
  } as unknown as ViewTransitionInfo;
  TestBed.runInInjectionContext(() => skipViewTransitionOnReducedMotion(info));
  return skipTransition;
}

describe('skipViewTransitionOnReducedMotion', () => {
  it('skips it under the Animations setting Reduced too', () => {
    const doc = {
      defaultView: {
        matchMedia: () => ({
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
      },
    } as unknown as Document;
    TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: doc }] });
    TestBed.inject(ReducedMotion).setAppReduced(true);
    const skipTransition = vi.fn();
    const info = { transition: fakeTransition(skipTransition) } as unknown as ViewTransitionInfo;
    TestBed.runInInjectionContext(() => skipViewTransitionOnReducedMotion(info));
    expect(skipTransition).toHaveBeenCalledTimes(1);
  });

  it('skips it while the tab is hidden', () => {
    expect(setup(false, 'hidden')).toHaveBeenCalledTimes(1);
  });

  it('handles the rejections of a skipped or aborted transition', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: {
            visibilityState: 'visible',
            defaultView: {
              matchMedia: () => ({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
              }),
            },
          },
        },
      ],
    });
    const caught = { ready: vi.fn(), updateCallbackDone: vi.fn(), finished: vi.fn() };
    const info = {
      transition: {
        skipTransition: vi.fn(),
        ready: { catch: caught.ready },
        updateCallbackDone: { catch: caught.updateCallbackDone },
        finished: { catch: caught.finished },
      },
    } as unknown as ViewTransitionInfo;
    TestBed.runInInjectionContext(() => skipViewTransitionOnReducedMotion(info));
    expect(caught.ready).toHaveBeenCalledTimes(1);
    expect(caught.updateCallbackDone).toHaveBeenCalledTimes(1);
    expect(caught.finished).toHaveBeenCalledTimes(1);
  });

  it('skips the page transition with prefers-reduced-motion', () => {
    expect(setup(true)).toHaveBeenCalledTimes(1);
  });

  it('skips it when only ?split changes (the right half of the side-by-side view)', () => {
    const route = { path: 'unsorted' };
    const root = (queryParams: Record<string, string>) =>
      ({
        firstChild: { routeConfig: route, params: {}, queryParams, firstChild: null },
      }) as unknown as ViewTransitionInfo['from'];
    const skipTransition = setup(false, 'visible', { from: root({}), to: root({ split: '' }) });
    expect(skipTransition).toHaveBeenCalledTimes(1);
  });

  it('lets the cross-fade run otherwise', () => {
    expect(setup(false)).not.toHaveBeenCalled();
  });

  it('skips it when the media query cannot be read', () => {
    expect(setup(null)).toHaveBeenCalledTimes(1);
  });
});
