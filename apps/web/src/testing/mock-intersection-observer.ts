import { vi } from 'vitest';

/** A controllable stand-in for `IntersectionObserver`; jsdom has none. */
export class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly observed: Element[] = [];
  disconnected = false;

  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    MockIntersectionObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.observed.push(target);
  }

  unobserve(): void {
    return;
  }

  disconnect(): void {
    this.disconnected = true;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /**
   * Reports every observed element as intersecting or not. `visibleHeight` / `height` set the
   * entry rects (default: the whole 100 px element when intersecting).
   */
  trigger(isIntersecting: boolean, visibleHeight = isIntersecting ? 100 : 0, height = 100): void {
    const entries = this.observed.map((target) => ({
      target,
      isIntersecting,
      intersectionRect: { height: visibleHeight },
      boundingClientRect: { height },
    }));
    this.callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
  }

  /** Reports to every live observer. */
  static triggerAll(isIntersecting: boolean): void {
    MockIntersectionObserver.instances
      .filter((observer) => !observer.disconnected)
      .forEach((observer) => observer.trigger(isIntersecting));
  }

  static install(): void {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  }
}

/** Stubs `matchMedia` so the reduced-motion query reports `matches`. */
export function stubReducedMotion(matches: boolean): void {
  vi.stubGlobal('matchMedia', (query: string): Partial<MediaQueryList> => ({
    matches: matches && query.includes('prefers-reduced-motion'),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

/** Sets the tab to visible or hidden and fires `visibilitychange`; reset it with `setTabState(true)`. */
export function setTabState(visible: boolean): void {
  Object.defineProperty(document, 'visibilityState', {
    value: visible ? 'visible' : 'hidden',
    configurable: true,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}
