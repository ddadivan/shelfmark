import { describe, expect, it } from 'vitest';
import { PointerVelocity } from './pointer-velocity';

describe('PointerVelocity', () => {
  it('is still before two samples', () => {
    const velocity = new PointerVelocity();
    expect(velocity.at(0)).toEqual({ x: 0, y: 0 });
    velocity.add(10, 10, 0);
    expect(velocity.at(0)).toEqual({ x: 0, y: 0 });
  });

  it('approaches a steady move smoothly', () => {
    const velocity = new PointerVelocity(50, 32);
    let first = 0;
    for (let i = 0; i <= 30; i++) {
      velocity.add(i * 16, i * 8, i * 16);
      if (i === 1) {
        first = velocity.at(i * 16).x;
      }
    }
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(1);
    expect(velocity.at(480).x).toBeCloseTo(1, 2);
    expect(velocity.at(480).y).toBeCloseTo(0.5, 2);
  });

  it('skips a sample at the same moment', () => {
    const velocity = new PointerVelocity(50, 32);
    velocity.add(0, 0, 0);
    velocity.add(100, 0, 0.5);
    expect(velocity.at(0.5)).toEqual({ x: 0, y: 0 });
    velocity.add(16, 0, 16);
    expect(velocity.at(16).x).toBeGreaterThan(0);
    expect(velocity.at(16).x).toBeLessThan(1);
  });

  it('decays to zero once the pointer rests', () => {
    const velocity = new PointerVelocity(50, 32);
    for (let i = 0; i <= 20; i++) {
      velocity.add(i * 16, 0, i * 16);
    }
    const moving = velocity.at(320).x;
    expect(velocity.at(320 + 32).x).toBe(moving);
    expect(velocity.at(320 + 32 + 50).x).toBeCloseTo(moving / Math.E, 5);
    expect(velocity.at(320 + 2000).x).toBeLessThan(1e-6);
  });

  it('forgets everything on reset', () => {
    const velocity = new PointerVelocity();
    velocity.add(0, 0, 0);
    velocity.add(50, 0, 16);
    velocity.reset();
    expect(velocity.at(20)).toEqual({ x: 0, y: 0 });
    velocity.add(60, 0, 32);
    expect(velocity.at(32)).toEqual({ x: 0, y: 0 });
  });
});
