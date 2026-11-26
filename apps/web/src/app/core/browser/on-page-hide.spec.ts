import { DOCUMENT } from '@angular/common';
import {
  createEnvironmentInjector,
  EnvironmentInjector,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { onPageHide } from './on-page-hide';

describe('onPageHide', () => {
  function inScope(): { injector: EnvironmentInjector; handler: () => void } {
    const injector = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
    const handler = vi.fn();
    runInInjectionContext(injector, () => onPageHide(handler));
    return { injector, handler };
  }

  it('runs the handler on pagehide', () => {
    const { injector, handler } = inScope();
    TestBed.inject(DOCUMENT).defaultView?.dispatchEvent(new Event('pagehide'));
    expect(handler).toHaveBeenCalledTimes(1);
    injector.destroy();
  });

  it('stops listening once the injector is destroyed', () => {
    const { injector, handler } = inScope();
    injector.destroy();
    TestBed.inject(DOCUMENT).defaultView?.dispatchEvent(new Event('pagehide'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('does nothing without a window', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { defaultView: null } }],
    });
    expect(() =>
      runInInjectionContext(TestBed.inject(Injector), () => onPageHide(() => undefined)),
    ).not.toThrow();
  });
});
