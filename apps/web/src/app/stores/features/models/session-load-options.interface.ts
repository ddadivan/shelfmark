export interface SessionLoadOptions {
  /** The store registers its own `SessionScope.onEnd` (it goes through a public `reset()`). */
  manualEnd?: boolean;
}
