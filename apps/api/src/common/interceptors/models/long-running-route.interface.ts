import type { HttpMethod } from '../../auth/models/http-method.type';

/** A route allowed to carry `@LongRunning()`. */
export interface LongRunningRoute {
  readonly method: HttpMethod;
  /** Full path including the `/api` prefix. */
  readonly path: string;
  /** Why the 8 s request timeout does not fit, and which deadlines the handler keeps instead. */
  readonly reason: string;
}
