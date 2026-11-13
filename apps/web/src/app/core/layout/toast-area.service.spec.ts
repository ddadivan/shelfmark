import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, vi } from 'vitest';
import { ToastAreaService } from './toast-area.service';
import { ViewportService } from './viewport.service';

const START = '--ui-toast-inset-start';
const END = '--ui-toast-inset-end';

function area(left: number, width: number): HTMLElement {
  const el = document.createElement('div');
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ left } as DOMRect);
  Object.defineProperty(el, 'clientWidth', { value: width });
  return el;
}

describe('ToastAreaService (#352)', () => {
  const desktop = signal(true);

  beforeEach(() => {
    desktop.set(true);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 1440,
      configurable: true,
    });
    TestBed.configureTestingModule({
      providers: [{ provide: ViewportService, useValue: { desktop } }],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.style.removeProperty(START);
    document.documentElement.style.removeProperty(END);
  });

  it('sets the distances of the last registered area to the window edges', () => {
    const service = TestBed.inject(ToastAreaService);
    service.register(area(296, 1120));
    TestBed.tick();
    expect(document.documentElement.style.getPropertyValue(START)).toBe('296px');
    expect(document.documentElement.style.getPropertyValue(END)).toBe('24px');

    const unregister = service.register(area(300, 1100));
    TestBed.tick();
    expect(document.documentElement.style.getPropertyValue(START)).toBe('300px');

    unregister();
    TestBed.tick();
    expect(document.documentElement.style.getPropertyValue(START)).toBe('296px');
  });

  it('leaves the toasts on the window centre without the sidebar', () => {
    desktop.set(false);
    TestBed.inject(ToastAreaService).register(area(296, 1120));
    TestBed.tick();
    expect(document.documentElement.style.getPropertyValue(START)).toBe('');
    expect(document.documentElement.style.getPropertyValue(END)).toBe('');
  });

  describe('a bar the toasts sit above', () => {
    const OFFSET = '--ui-toast-offset';

    afterEach(() => document.documentElement.style.removeProperty(OFFSET));

    function bar(top: number): HTMLElement {
      const host = document.createElement('div');
      const el = document.createElement('div');
      host.append(el);
      document.body.append(host);
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ top } as DOMRect);
      return el;
    }

    it('keeps the toasts 12px above the bar, on any shell, until it goes', () => {
      vi.stubGlobal('innerHeight', 900);
      desktop.set(false);
      const service = TestBed.inject(ToastAreaService);
      const el = bar(790);
      const unregister = service.registerBar(el);
      TestBed.tick();
      expect(document.documentElement.style.getPropertyValue(OFFSET)).toBe('122px');

      unregister();
      TestBed.tick();
      expect(document.documentElement.style.getPropertyValue(OFFSET)).toBe('');
      el.parentElement?.remove();
    });

    it('measures again after the entrance animation and on resize', async () => {
      vi.stubGlobal('innerHeight', 900);
      const service = TestBed.inject(ToastAreaService);
      const el = bar(820);
      service.registerBar(el);
      TestBed.tick();
      expect(document.documentElement.style.getPropertyValue(OFFSET)).toBe('92px');

      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ top: 790 } as DOMRect);
      el.parentElement?.dispatchEvent(new Event('animationend'));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(document.documentElement.style.getPropertyValue(OFFSET)).toBe('122px');

      vi.stubGlobal('innerHeight', 800);
      window.dispatchEvent(new Event('resize'));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(document.documentElement.style.getPropertyValue(OFFSET)).toBe('22px');
      el.parentElement?.remove();
    });
  });
});
