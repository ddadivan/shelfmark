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
});
