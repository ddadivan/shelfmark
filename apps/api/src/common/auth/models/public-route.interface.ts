export interface PublicRoute {
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Full path including the `/api` prefix. */
  readonly path: string;
  /** Why this route may be reached without a session (also commented at the use site). */
  readonly reason: string;
}
