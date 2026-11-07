import type { HttpMethod } from './http-method.type';

export interface PublicRoute {
  readonly method: HttpMethod;
  /** Full path including the `/api` prefix. */
  readonly path: string;
  /** Why this route may be reached without a session (also commented at the use site). */
  readonly reason: string;
}
