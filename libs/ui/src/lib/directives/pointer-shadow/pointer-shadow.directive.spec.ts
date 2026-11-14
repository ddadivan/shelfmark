import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PointerShadowDirective } from './pointer-shadow.directive';
import { POINTER_SHADOW_MAX_OFFSET_PX } from './models/pointer-shadow.const';

@Component({
  imports: [PointerShadowDirective],
  template: `<div id="box" uiPointerShadow>Card</div>`,
})
class HostComponent {}

const MAX = `${POINTER_SHADOW_MAX_OFFSET_PX}.0px`;

function setup(matching: readonly string[]) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matching.some((m) => query.includes(m)),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  const frames: FrameRequestCallback[] = [];
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
    frames.length = 0;
  });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const box = (fixture.nativeElement as HTMLElement).querySelector('#box') as HTMLElement;
  box.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100 }) as DOMRect;
  const flush = (): void => {
    frames.splice(0).forEach((cb) => {
      cb(0);
    });
  };
  return { fixture, box, flush, frames };
}

function pointer(type: string, x: number, y: number, pointerType = 'mouse'): PointerEvent {
  return new PointerEvent(type, { clientX: x, clientY: y, pointerType });
}

describe('PointerShadowDirective', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shifts the shadow away from the pointer, a few px at most', () => {
    const { box, flush } = setup(['hover: hover']);
    box.dispatchEvent(pointer('pointerenter', 200, 50));
    flush();
    expect(box.style.getPropertyValue('--shadow-x')).toBe(`-${MAX}`);
    expect(box.style.getPropertyValue('--shadow-y')).toBe('0.0px');
    box.dispatchEvent(pointer('pointermove', 0, 100));
    flush();
    expect(box.style.getPropertyValue('--shadow-x')).toBe(MAX);
    expect(box.style.getPropertyValue('--shadow-y')).toBe(`-${MAX}`);
    expect(box.style.transform).toBe('');
  });

  it('applies one update per frame', () => {
    const { box, flush, frames } = setup(['hover: hover']);
    box.dispatchEvent(pointer('pointerenter', 100, 50));
    box.dispatchEvent(pointer('pointermove', 150, 50));
    box.dispatchEvent(pointer('pointermove', 200, 50));
    expect(frames).toHaveLength(1);
    flush();
    expect(box.style.getPropertyValue('--shadow-x')).toBe(`-${MAX}`);
  });

  it('resets on pointerleave and stops listening to moves', () => {
    const { box, flush } = setup(['hover: hover']);
    box.dispatchEvent(pointer('pointerenter', 200, 50));
    flush();
    box.dispatchEvent(pointer('pointerleave', 0, 0));
    expect(box.style.getPropertyValue('--shadow-x')).toBe('');
    expect(box.style.getPropertyValue('--shadow-y')).toBe('');
    box.dispatchEvent(pointer('pointermove', 0, 0));
    flush();
    expect(box.style.getPropertyValue('--shadow-x')).toBe('');
  });

  it('does nothing under prefers-reduced-motion', () => {
    const { box, flush } = setup(['hover: hover', 'prefers-reduced-motion']);
    box.dispatchEvent(pointer('pointerenter', 200, 50));
    box.dispatchEvent(pointer('pointermove', 0, 0));
    flush();
    expect(box.style.getPropertyValue('--shadow-x')).toBe('');
  });

  it('does nothing without a fine hovering pointer', () => {
    const { box, flush } = setup([]);
    box.dispatchEvent(pointer('pointerenter', 200, 50));
    flush();
    expect(box.style.getPropertyValue('--shadow-x')).toBe('');
  });

  it('ignores touch pointers', () => {
    const { box, flush } = setup(['hover: hover']);
    box.dispatchEvent(pointer('pointerenter', 200, 50, 'touch'));
    flush();
    expect(box.style.getPropertyValue('--shadow-x')).toBe('');
  });

  it('removes the properties and listeners on destroy', () => {
    const { fixture, box, flush } = setup(['hover: hover']);
    box.dispatchEvent(pointer('pointerenter', 200, 50));
    flush();
    fixture.destroy();
    expect(box.style.getPropertyValue('--shadow-x')).toBe('');
    box.dispatchEvent(pointer('pointerenter', 200, 50));
    flush();
    expect(box.style.getPropertyValue('--shadow-x')).toBe('');
  });
});
