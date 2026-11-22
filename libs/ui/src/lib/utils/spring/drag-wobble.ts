import { DRAG_WOBBLE } from './models/drag-wobble.const';
import { DRAG_WOBBLE_SPRING } from './models/drag-wobble-spring.const';
import type { FrameScheduler } from './models/frame-scheduler.interface';
import type { SpringState } from './models/spring-state.interface';
import { PointerVelocity } from './pointer-velocity';
import { springAtRest, stepSpring } from './spring-step';

/** Below this target tilt (degrees) and squash the wobble may come to rest. */
const REST = 0.01;

/** A frame gap assumed for the first frame after a wake-up (ms). */
const FIRST_FRAME_MS = 1000 / 60;

/**
 * The live tilt of a dragged preview (Motion «Drag a link»): pointer moves feed a smoothed
 * velocity, the target tilt is `clamp(vx · TiltPerVelocity, ±MaxTilt)` and a damped spring drives
 * the tilt there once per animation frame; a fast vertical move squashes the element a little.
 * Writes only `element.style.transform` (CSSOM). The loop runs while something moves and stops at
 * rest, where the inline transform is cleared again.
 */
export class DragWobble {
  private readonly velocity = new PointerVelocity();
  private tilt: SpringState = { value: 0, velocity: 0 };
  private frame: number | null = null;
  private lastFrame: number | null = null;
  private stopped = false;

  constructor(
    private readonly element: HTMLElement,
    private readonly scheduler: FrameScheduler,
  ) {}

  /** The current tilt in degrees (on top of any static tilt in CSS). */
  get angle(): number {
    return this.tilt.value;
  }

  /** The frame loop is running. */
  get running(): boolean {
    return this.frame !== null;
  }

  /** The pointer is at `x`, `y` (viewport px) at `time` (ms, the clock of the frame callbacks). */
  move(x: number, y: number, time: number): void {
    if (this.stopped) {
      return;
    }
    this.velocity.add(x, y, time);
    this.wake();
  }

  /** The pointer let go without a fly: the velocity drops and the spring brings the tilt to rest. */
  settle(): void {
    if (this.stopped) {
      return;
    }
    this.velocity.reset();
    this.wake();
  }

  /** Ends the wobble for good (the preview flies off or is destroyed); the transform stays as is. */
  stop(): void {
    this.stopped = true;
    if (this.frame !== null) {
      this.scheduler.cancel(this.frame);
      this.frame = null;
    }
  }

  private wake(): void {
    if (this.frame === null) {
      this.frame = this.scheduler.request(this.tick);
    }
  }

  private readonly tick = (time: number): void => {
    this.frame = null;
    const elapsed = this.lastFrame === null ? FIRST_FRAME_MS : time - this.lastFrame;
    this.lastFrame = time;
    const velocity = this.velocity.at(time);
    const target = clamp(velocity.x * DRAG_WOBBLE.TiltPerVelocity, DRAG_WOBBLE.MaxTilt);
    this.tilt = stepSpring(this.tilt, target, elapsed, DRAG_WOBBLE_SPRING);
    const squash = Math.min(
      Math.abs(velocity.y) * DRAG_WOBBLE.SquashPerVelocity,
      DRAG_WOBBLE.MaxSquash,
    );
    if (Math.abs(target) < REST && squash < REST && springAtRest(this.tilt, 0)) {
      this.tilt = { value: 0, velocity: 0 };
      this.lastFrame = null;
      this.element.style.removeProperty('transform');
      return;
    }
    // Squash: a little shorter and as much wider, so the area stays about the same.
    this.element.style.transform =
      `rotate(${round(this.tilt.value)}deg) ` + `scale(${round(1 + squash)}, ${round(1 - squash)})`;
    this.frame = this.scheduler.request(this.tick);
  };
}

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
