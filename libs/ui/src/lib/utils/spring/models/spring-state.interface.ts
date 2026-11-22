/** Where a spring is (`value`) and how fast it moves (`velocity`, value units per second). */
export interface SpringState {
  readonly value: number;
  readonly velocity: number;
}
