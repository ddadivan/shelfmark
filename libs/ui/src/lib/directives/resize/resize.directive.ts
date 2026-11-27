import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  output,
  signal,
} from '@angular/core';
import type { ElementSize } from './models/element-size.interface';

/**
 * The border-box size of its host, kept in a signal (`size`, through `exportAs="uiResize"`) and
 * emitted as `resized` on every change (a `ResizeObserver`). `size` is `undefined` until the first
 * measure, which runs once after the first render; where the browser has no `ResizeObserver`
 * nothing is measured and nothing is emitted. Also usable as a host directive.
 */
@Directive({
  selector: '[uiResize]',
  exportAs: 'uiResize',
})
export class UiResizeDirective {
  /** The host's size changed (not for the first measure, which only fills `size`). */
  readonly resized = output<ElementSize>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly sizeState = signal<ElementSize | undefined>(undefined);
  /** The latest size; `undefined` before the first measure or without a `ResizeObserver`. */
  readonly size = this.sizeState.asReadonly();

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const Observer = this.host.ownerDocument.defaultView?.ResizeObserver;
      if (Observer === undefined) {
        return;
      }
      this.measure();
      const observer = new Observer(() => {
        this.resized.emit(this.measure());
      });
      observer.observe(this.host);
      destroyRef.onDestroy(() => {
        observer.disconnect();
      });
    });
  }

  private measure(): ElementSize {
    const { width, height } = this.host.getBoundingClientRect();
    const size = { width, height };
    this.sizeState.set(size);
    return size;
  }
}
