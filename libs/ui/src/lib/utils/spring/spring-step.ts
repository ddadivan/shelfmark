import type { SpringConfig } from './models/spring-config.interface';
import { SPRING_LIMITS } from './models/spring-limits.const';
import type { SpringState } from './models/spring-state.interface';

/**
 * Advances a damped spring towards `target` by `elapsedMs` (semi-implicit Euler in substeps of at
 * most 1/120 s, so a long frame never makes it explode; gaps over 64 ms count as 64 ms).
 */
export function stepSpring(
  state: SpringState,
  target: number,
  elapsedMs: number,
  config: SpringConfig,
): SpringState {
  let { value, velocity } = state;
  let remaining = Math.min(Math.max(elapsedMs, 0), SPRING_LIMITS.MaxFrameMs);
  while (remaining > 0) {
    const step = Math.min(remaining, SPRING_LIMITS.MaxSubstepMs);
    const seconds = step / 1000;
    const force = -config.stiffness * (value - target) - config.damping * velocity;
    velocity += (force / config.mass) * seconds;
    value += velocity * seconds;
    remaining -= step;
  }
  return { value, velocity };
}

/** The spring sits at `target` and has (almost) stopped moving. */
export function springAtRest(
  state: SpringState,
  target: number,
  epsilon: number = SPRING_LIMITS.RestEpsilon,
): boolean {
  return Math.abs(state.value - target) < epsilon && Math.abs(state.velocity) < epsilon;
}
