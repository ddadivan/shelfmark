import { describe, expect, it } from 'vitest';
import { DragWobble } from './drag-wobble';
import { DRAG_WOBBLE } from './models/drag-wobble.const';
import type { FrameScheduler } from './models/frame-scheduler.interface';

/** A manual rAF: `flush(time)` runs the frame that is waiting. */
function fakeScheduler() {
  let next: ((time: number) => void) | null = null;
  let id = 0;
  const scheduler: FrameScheduler = {
    request: (callback) => {
      next = callback;
      return ++id;
    },
    cancel: () => {
      next = null;
    },
  };
  return {
    scheduler,
    pending: () => next !== null,
    flush: (time: number) => {
      const callback = next;
      next = null;
      callback?.(time);
    },
  };
}

function rotation(element: HTMLElement): number {
  const match = /rotate\((-?[\d.]+)deg\)/.exec(element.style.transform);
  return match ? Number(match[1]) : 0;
}

/** Moves right at `speed` px/ms for `frames` frames of 16 ms, one sample per frame. */
function drag(
  wobble: DragWobble,
  frames: ReturnType<typeof fakeScheduler>,
  speed: number,
  count: number,
  start = 0,
): number {
  let time = start;
  for (let i = 0; i < count; i++) {
    time += 16;
    wobble.move(time * speed, 100, time);
    frames.flush(time);
  }
  return time;
}

describe('DragWobble', () => {
  it('leans into a move to the right and writes only the transform', () => {
    const element = document.createElement('div');
    const frames = fakeScheduler();
    const wobble = new DragWobble(element, frames.scheduler);
    drag(wobble, frames, 1, 40);
    expect(rotation(element)).toBeGreaterThan(4);
    expect(rotation(element)).toBeLessThanOrEqual(DRAG_WOBBLE.MaxTilt + 1);
    expect(element.getAttribute('style')).toMatch(/^transform: [^;]+;$/);
  });

  it('leans the other way for a move to the left', () => {
    const element = document.createElement('div');
    const frames = fakeScheduler();
    const wobble = new DragWobble(element, frames.scheduler);
    drag(wobble, frames, -1, 40);
    expect(rotation(element)).toBeLessThan(-4);
  });

  it('never leans past the limit, however fast', () => {
    const element = document.createElement('div');
    const frames = fakeScheduler();
    const wobble = new DragWobble(element, frames.scheduler);
    let peak = 0;
    let time = 0;
    for (let i = 0; i < 80; i++) {
      time += 16;
      wobble.move(time * 20, 100, time);
      frames.flush(time);
      peak = Math.max(peak, Math.abs(wobble.angle));
    }
    // The spring may overshoot its clamped target a little, never far.
    expect(peak).toBeLessThan(DRAG_WOBBLE.MaxTilt * 1.25);
  });

  it('sways back to rest when the pointer stops, then stops the loop and clears the style', () => {
    const element = document.createElement('div');
    const frames = fakeScheduler();
    const wobble = new DragWobble(element, frames.scheduler);
    let time = drag(wobble, frames, 1, 30);
    let crossedZero = false;
    for (let i = 0; i < 200 && frames.pending(); i++) {
      time += 16;
      frames.flush(time);
      if (wobble.angle < 0) {
        crossedZero = true;
      }
    }
    expect(crossedZero).toBe(true);
    expect(frames.pending()).toBe(false);
    expect(wobble.running).toBe(false);
    expect(wobble.angle).toBe(0);
    expect(element.style.transform).toBe('');
  });

  it('squashes on a fast vertical move', () => {
    const element = document.createElement('div');
    const frames = fakeScheduler();
    const wobble = new DragWobble(element, frames.scheduler);
    let time = 0;
    for (let i = 0; i < 20; i++) {
      time += 16;
      wobble.move(100, time * 3, time);
      frames.flush(time);
    }
    expect(element.style.transform).toContain(
      `scale(${1 + DRAG_WOBBLE.MaxSquash}, ${1 - DRAG_WOBBLE.MaxSquash})`,
    );
  });

  it('settle drops the velocity at once', () => {
    const element = document.createElement('div');
    const frames = fakeScheduler();
    const wobble = new DragWobble(element, frames.scheduler);
    let time = drag(wobble, frames, 1, 30);
    wobble.settle();
    for (let i = 0; i < 200 && frames.pending(); i++) {
      time += 16;
      frames.flush(time);
    }
    expect(wobble.angle).toBe(0);
  });

  it('does nothing more after stop', () => {
    const element = document.createElement('div');
    const frames = fakeScheduler();
    const wobble = new DragWobble(element, frames.scheduler);
    wobble.move(0, 0, 0);
    expect(frames.pending()).toBe(true);
    wobble.stop();
    expect(frames.pending()).toBe(false);
    wobble.move(10, 0, 16);
    wobble.settle();
    expect(frames.pending()).toBe(false);
  });
});
