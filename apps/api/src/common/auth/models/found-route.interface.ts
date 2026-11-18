/** One route found by `scanRoutes`. */
export interface FoundRoute {
  /** `METHOD /full/path`. */
  key: string;
  isPublic: boolean;
  optional: boolean;
  usesCurrentUser: boolean;
  /** Carries `@LongRunning()` (skipped by `TimeoutInterceptor`). */
  longRunning: boolean;
}
