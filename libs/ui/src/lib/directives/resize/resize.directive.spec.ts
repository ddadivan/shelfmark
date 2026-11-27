import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UiResizeDirective } from './resize.directive';
import type { ElementSize } from './models/element-size.interface';

@Component({
  imports: [UiResizeDirective],
  template: `<div uiResize #r="uiResize" (resized)="sizes.push($event)">
    {{ r.size()?.width }}
  </div>`,
})
class HostComponent {
  readonly sizes: ElementSize[] = [];
}

describe('UiResizeDirective', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('measures once, emits on every resize and disconnects on destroy', async () => {
    let notify: () => void = () => undefined;
    const disconnect = vi.fn();
    const observe = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe = observe;
        disconnect = disconnect;
      },
    );
    const fixture = TestBed.createComponent(HostComponent);
    const div = (fixture.nativeElement as HTMLElement).querySelector('div') as HTMLDivElement;
    const rect = vi.spyOn(div, 'getBoundingClientRect');
    rect.mockReturnValue({ width: 300, height: 50 } as DOMRect);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(div.textContent?.trim()).toBe('300');
    expect(observe).toHaveBeenCalledWith(div);
    expect(fixture.componentInstance.sizes).toEqual([]);

    rect.mockReturnValue({ width: 1234, height: 60 } as DOMRect);
    notify();
    fixture.detectChanges();
    expect(fixture.componentInstance.sizes).toEqual([{ width: 1234, height: 60 }]);
    expect(div.textContent?.trim()).toBe('1234');

    fixture.destroy();
    expect(disconnect).toHaveBeenCalled();
  });

  it('does nothing without ResizeObserver', async () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.sizes).toEqual([]);
    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('');
  });
});
