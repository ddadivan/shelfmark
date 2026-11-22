import { DRAG_WOBBLE } from './models/drag-wobble.const';
import type { Velocity } from './models/velocity.interface';

const STILL: Velocity = { x: 0, y: 0 };

/**
 * A smoothed pointer velocity (px per ms): every sample blends the raw velocity since the last
 * one into the running value (exponential smoothing, time constant `smoothingMs`), and a pointer
 * that rests longer than `idleMs` loses its velocity at the same rate, so it always returns to 0.
 */
export class PointerVelocity {
  private last: { x: number; y: number; time: number } | null = null;
  private current: Velocity = STILL;

  constructor(
    private readonly smoothingMs: number = DRAG_WOBBLE.VelocitySmoothingMs,
    private readonly idleMs: number = DRAG_WOBBLE.VelocityIdleMs,
  ) {}

  /** A pointer position at `time` (ms, the same clock as `at`). */
  add(x: number, y: number, time: number): void {
    const last = this.last;
    if (last && time - last.time < 1) {
      // The same moment twice (pointer and touch events of one move): wait for a real interval.
      return;
    }
    const before = this.decayed(time);
    this.last = { x, y, time };
    if (!last) {
      return;
    }
    const elapsed = time - last.time;
    const blend = 1 - Math.exp(-elapsed / this.smoothingMs);
    this.current = {
      x: before.x + blend * ((x - last.x) / elapsed - before.x),
      y: before.y + blend * ((y - last.y) / elapsed - before.y),
    };
  }

  /** The smoothed velocity at `time`, decayed when the pointer has rested. */
  at(time: number): Velocity {
    return this.decayed(time);
  }

  /** Forgets the pointer: the velocity is 0 until two new samples arrive. */
  reset(): void {
    this.last = null;
    this.current = STILL;
  }

  private decayed(time: number): Velocity {
    if (!this.last) {
      return this.current;
    }
    const rested = time - this.last.time - this.idleMs;
    if (rested <= 0) {
      return this.current;
    }
    const keep = Math.exp(-rested / this.smoothingMs);
    return { x: this.current.x * keep, y: this.current.y * keep };
  }
}
