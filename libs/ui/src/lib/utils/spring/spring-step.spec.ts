import { describe, expect, it } from 'vitest';
import { DRAG_WOBBLE_SPRING } from './models/drag-wobble-spring.const';
import { springAtRest, stepSpring } from './spring-step';

function run(frames: number, target: number, start = { value: 0, velocity: 0 }) {
  let state = start;
  const values: number[] = [];
  for (let i = 0; i < frames; i++) {
    state = stepSpring(state, target, 16, DRAG_WOBBLE_SPRING);
    values.push(state.value);
  }
  return { state, values };
}

describe('stepSpring', () => {
  it('moves towards the target and settles there', () => {
    const { state } = run(120, 10);
    expect(state.value).toBeCloseTo(10, 2);
    expect(springAtRest(state, 10)).toBe(true);
  });

  it('overshoots once (a sway), not a jiggle', () => {
    const { values } = run(120, 10);
    const peak = Math.max(...values);
    expect(peak).toBeGreaterThan(10);
    expect(peak).toBeLessThan(12);
    // After the peak it comes back with at most a barely visible dip below the target.
    const afterPeak = values.slice(values.indexOf(peak));
    expect(Math.min(...afterPeak)).toBeGreaterThan(9.8);
  });

  it('stays stable on a long frame (background tab)', () => {
    const state = stepSpring({ value: 0, velocity: 0 }, 10, 5000, DRAG_WOBBLE_SPRING);
    expect(Number.isFinite(state.value)).toBe(true);
    expect(Math.abs(state.value)).toBeLessThan(20);
  });

  it('ignores a negative or zero gap', () => {
    const start = { value: 3, velocity: 1 };
    expect(stepSpring(start, 0, 0, DRAG_WOBBLE_SPRING)).toEqual(start);
    expect(stepSpring(start, 0, -5, DRAG_WOBBLE_SPRING)).toEqual(start);
  });
});

describe('springAtRest', () => {
  it('needs both the position and the velocity to be still', () => {
    expect(springAtRest({ value: 0, velocity: 0 }, 0)).toBe(true);
    expect(springAtRest({ value: 0, velocity: 1 }, 0)).toBe(false);
    expect(springAtRest({ value: 1, velocity: 0 }, 0)).toBe(false);
    expect(springAtRest({ value: 0.5, velocity: 0 }, 0, 1)).toBe(true);
  });
});
