/** A damped spring: force = −stiffness · offset − damping · velocity, divided by mass. */
export interface SpringConfig {
  readonly stiffness: number;
  readonly damping: number;
  readonly mass: number;
}
