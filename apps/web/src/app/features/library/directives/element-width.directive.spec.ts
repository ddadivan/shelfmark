import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ElementWidthDirective } from './element-width.directive';

@Component({
  imports: [ElementWidthDirective],
  template: `<div (appElementWidth)="widths.push($event)"></div>`,
})
class HostComponent {
  readonly widths: number[] = [];
}

describe('ElementWidthDirective', () => {
  const original = globalThis.ResizeObserver;
  afterEach(() => {
    globalThis.ResizeObserver = original;
  });

  it('emits the host width on every resize and stops on destroy', () => {
    let notify: () => void = () => undefined;
    const disconnect = vi.fn();
    globalThis.ResizeObserver = class {
      constructor(callback: () => void) {
        notify = callback;
      }
      observe(): void {}
      unobserve(): void {}
      disconnect = disconnect;
    } as unknown as typeof ResizeObserver;
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const div = fixture.nativeElement.querySelector('div') as HTMLElement;
    vi.spyOn(div, 'getBoundingClientRect').mockReturnValue({ width: 1234 } as DOMRect);
    notify();
    expect(fixture.componentInstance.widths).toEqual([1234]);
    fixture.destroy();
    expect(disconnect).toHaveBeenCalled();
  });

  it('does nothing without ResizeObserver', () => {
    globalThis.ResizeObserver = undefined as unknown as typeof ResizeObserver;
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.widths).toEqual([]);
  });
});
