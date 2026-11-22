import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReducedMotion } from '../../services/motion/reduced-motion.service';
import { DragWobbleDirective } from './drag-wobble.directive';

@Component({
  imports: [DragWobbleDirective],
  template: `
    <div id="root">
      @if (shown()) {
        <div id="wobble" uiDragWobble (uiDragWobbleAttached)="attached = $event">
          <span id="body">Card</span>
        </div>
      }
    </div>
  `,
})
class HostComponent {
  readonly shown = signal(true);
  attached: DragWobbleDirective | null = null;
}

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return new DOMRect(left, top, width, height);
}

function setup(reduced = false) {
  const frames: FrameRequestCallback[] = [];
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
    frames.length = 0;
  });
  TestBed.inject(ReducedMotion).setAppReduced(reduced);
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const wobble = root.querySelector('#wobble') as HTMLElement;
  let clock = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  const flush = (time: number): void => {
    frames.splice(0).forEach((cb) => {
      cb(time);
    });
  };
  const moveTo = (x: number, time: number): void => {
    clock = time;
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: 50 }));
  };
  return { fixture, root, wobble, frames, flush, moveTo };
}

describe('DragWobbleDirective', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hands itself to the owner once created', () => {
    const { fixture, wobble } = setup();
    const directive = fixture.componentInstance.attached;
    expect(directive).toBeInstanceOf(DragWobbleDirective);
    expect(directive?.element).toBe(wobble);
    expect(directive?.active).toBe(true);
  });

  it('tilts with the pointer moves of the document', () => {
    const { wobble, flush, moveTo } = setup();
    for (let i = 1; i <= 20; i++) {
      moveTo(i * 16, i * 16);
      flush(i * 16);
    }
    expect(wobble.style.transform).toMatch(/^rotate\(\d+(\.\d+)?deg\) scale\(/);
  });

  it('follows touch moves too', () => {
    const { wobble, flush } = setup();
    let clock = 0;
    vi.mocked(performance.now).mockImplementation(() => clock);
    for (let i = 1; i <= 20; i++) {
      clock = i * 16;
      const event = new Event('touchmove') as TouchEvent;
      Object.defineProperty(event, 'touches', {
        value: { item: () => ({ clientX: i * 16, clientY: 10 }) },
      });
      document.dispatchEvent(event);
      flush(clock);
    }
    expect(wobble.style.transform).toContain('rotate(');
  });

  it('settles back to rest', () => {
    const { fixture, wobble, frames, flush, moveTo } = setup();
    for (let i = 1; i <= 20; i++) {
      moveTo(i * 16, i * 16);
      flush(i * 16);
    }
    fixture.componentInstance.attached?.settle();
    let time = 320;
    for (let i = 0; i < 300 && frames.length > 0; i++) {
      time += 16;
      flush(time);
    }
    expect(wobble.style.transform).toBe('');
  });

  it('flies into the target: translate to its centre, shrink and fade', () => {
    const { fixture, root, wobble } = setup();
    const container = root.querySelector('#root') as HTMLElement;
    container.getBoundingClientRect = () => rect(100, 100, 200, 100);
    (wobble.querySelector('#body') as HTMLElement).getBoundingClientRect = () =>
      rect(120, 120, 100, 50);
    const flown = fixture.componentInstance.attached?.flyTo(
      rect(0, 400, 40, 20),
      rect(10, 10, 200, 100),
    );
    expect(flown).toBe(true);
    // Origin 0 0 (jsdom computes none): centre (70, 45) in the root; end centre at 10 + 0.2 · 70.
    expect(wobble.style.transform).toBe('translate(-4px, 391px) scale(0.2)');
    expect(wobble.style.opacity).toBe('0');
    expect(wobble.style.transition).toContain('var(--duration-slow)');
  });

  it('does not fly without a body to measure', () => {
    const { fixture, wobble } = setup();
    (wobble.querySelector('#body') as HTMLElement).getBoundingClientRect = () => rect(0, 0, 0, 0);
    expect(fixture.componentInstance.attached?.flyTo(rect(0, 0, 1, 1), rect(0, 0, 1, 1))).toBe(
      false,
    );
    expect(wobble.style.transform).toBe('');
  });

  it('stays still under reduced motion and refuses to fly', () => {
    const { fixture, wobble, frames, moveTo } = setup(true);
    const directive = fixture.componentInstance.attached;
    expect(directive?.active).toBe(false);
    moveTo(50, 16);
    expect(frames).toHaveLength(0);
    directive?.settle();
    expect(directive?.flyTo(rect(0, 0, 10, 10), rect(0, 0, 10, 10))).toBe(false);
    expect(wobble.style.transform).toBe('');
  });

  it('stops listening once destroyed', () => {
    const { fixture, frames, moveTo } = setup();
    fixture.componentInstance.shown.set(false);
    fixture.detectChanges();
    frames.length = 0;
    moveTo(50, 16);
    expect(frames).toHaveLength(0);
  });
});
