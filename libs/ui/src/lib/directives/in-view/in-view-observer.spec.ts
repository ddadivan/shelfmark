import { afterEach, describe, expect, it, vi } from 'vitest';
import { InViewObserver, scrollParent } from './in-view-observer';

class FakeObserver {
  static instances: FakeObserver[] = [];
  disconnected = false;
  constructor(
    readonly callback: (entries: unknown[]) => void,
    readonly options?: IntersectionObserverInit,
  ) {
    FakeObserver.instances.push(this);
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect(): void {
    this.disconnected = true;
  }
}

describe('InViewObserver', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeObserver.instances = [];
  });

  it('builds one observer per option set, observes afresh on start and passes entries on', () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const seen: unknown[] = [];
    const element = document.createElement('div');
    const observer = new InViewObserver(element, (entries) => seen.push(...entries));
    observer.start({ root: null, margin: '0px', threshold: [0, 0.2] });
    observer.start({ root: null, margin: '0px', threshold: [0, 0.2] });
    expect(FakeObserver.instances.length).toBe(1);
    expect(FakeObserver.instances[0]?.observe).toHaveBeenCalledTimes(2);
    expect(FakeObserver.instances[0]?.options).toMatchObject({ threshold: [0, 0.2] });
    FakeObserver.instances[0]?.callback([{ isIntersecting: true }]);
    expect(seen).toEqual([{ isIntersecting: true }]);

    observer.start({ root: null, margin: '10px', threshold: 0 });
    expect(FakeObserver.instances.length).toBe(2);
    expect(FakeObserver.instances[0]?.disconnected).toBe(true);
    observer.disconnect();
    expect(FakeObserver.instances[1]?.disconnected).toBe(true);
    observer.start({ root: null, margin: '10px', threshold: 0 });
    expect(FakeObserver.instances.length).toBe(3);
  });

  it('does nothing without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    expect(InViewObserver.supported).toBe(false);
    const observer = new InViewObserver(document.createElement('div'), () => undefined);
    expect(() => {
      observer.start({ root: 'scroll-parent', margin: '0px', threshold: 0 });
      observer.disconnect();
    }).not.toThrow();
  });

  it('takes an element as root and finds the scroll parent', () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const scroller = document.createElement('div');
    scroller.style.overflowY = 'scroll';
    const element = document.createElement('div');
    scroller.append(element);
    document.body.append(scroller);
    expect(scrollParent(element)).toBe(scroller);
    new InViewObserver(element, () => undefined).start({
      root: 'scroll-parent',
      margin: '0px',
      threshold: 0,
    });
    expect(FakeObserver.instances[0]?.options?.root).toBe(scroller);
    new InViewObserver(element, () => undefined).start({
      root: scroller,
      margin: '0px',
      threshold: 0,
    });
    expect(FakeObserver.instances[1]?.options?.root).toBe(scroller);
    scroller.remove();
    expect(scrollParent(document.createElement('div'))).toBeNull();
  });
});
