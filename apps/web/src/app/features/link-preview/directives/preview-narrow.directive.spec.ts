import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PreviewNarrowDirective } from './preview-narrow.directive';

@Component({
  imports: [PreviewNarrowDirective],
  template: `<div appPreviewNarrow #w="previewNarrow" [appPreviewNarrowBelow]="30">
    {{ w.narrow() }}
  </div>`,
})
class HostComponent {}

describe('PreviewNarrowDirective', () => {
  let callback: ResizeObserverCallback | undefined;

  afterEach(() => {
    vi.unstubAllGlobals();
    callback = undefined;
  });

  function stubObserver(): void {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: ResizeObserverCallback) {
          callback = cb;
        }
        observe(): void {}
        disconnect(): void {}
      },
    );
  }

  it('is narrow below the given rem width and follows resizes', async () => {
    stubObserver();
    const fixture = TestBed.createComponent(HostComponent);
    const el = (fixture.nativeElement as HTMLElement).querySelector('div') as HTMLDivElement;
    const width = vi.spyOn(el, 'getBoundingClientRect');
    width.mockReturnValue({ width: 400 } as DOMRect);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.textContent?.trim()).toBe('true');

    width.mockReturnValue({ width: 600 } as DOMRect);
    callback?.([], {} as ResizeObserver);
    fixture.detectChanges();
    expect(el.textContent?.trim()).toBe('false');
  });
});
