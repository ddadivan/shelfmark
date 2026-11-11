import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { REDUCED_MOTION_QUERY } from './models/reduced-motion-query.const';
import { ReducedMotion } from './reduced-motion.service';

function fakeQuery(matches: boolean) {
  let listener: ((event: MediaQueryListEvent) => void) | null = null;
  const query = {
    matches,
    addEventListener: vi.fn((_: string, l: (event: MediaQueryListEvent) => void) => (listener = l)),
    removeEventListener: vi.fn(),
  };
  return {
    query,
    fire: (next: boolean) => listener?.({ matches: next } as MediaQueryListEvent),
  };
}

describe('ReducedMotion', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('follows the device query live', () => {
    const fake = fakeQuery(false);
    const matchMedia = vi.fn(() => fake.query);
    vi.stubGlobal('matchMedia', matchMedia);
    const motion = TestBed.inject(ReducedMotion);
    expect(matchMedia).toHaveBeenCalledWith(REDUCED_MOTION_QUERY);
    expect(motion.reduced()).toBe(false);
    fake.fire(true);
    expect(motion.reduced()).toBe(true);
    TestBed.resetTestingModule();
    expect(fake.query.removeEventListener).toHaveBeenCalled();
  });

  it('adds the app setting to the device, never removes the device request', () => {
    const fake = fakeQuery(false);
    vi.stubGlobal('matchMedia', () => fake.query);
    const motion = TestBed.inject(ReducedMotion);
    motion.setAppReduced(true);
    expect(motion.reduced()).toBe(true);
    motion.setAppReduced(false);
    expect(motion.reduced()).toBe(false);
    fake.fire(true);
    expect(motion.reduced()).toBe(true);
  });

  it('takes the device as not asking without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(TestBed.inject(ReducedMotion).reduced()).toBe(false);
  });
});
