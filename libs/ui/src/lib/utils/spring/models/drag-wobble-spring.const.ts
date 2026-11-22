import type { SpringConfig } from './spring-config.interface';

/**
 * The drag preview's tilt spring (Motion «Drag a link»): damping ratio about 0.6, so it leans
 * into a move and sways back once when the pointer stops, never a jiggle.
 */
export const DRAG_WOBBLE_SPRING: SpringConfig = { stiffness: 220, damping: 18, mass: 1 };
