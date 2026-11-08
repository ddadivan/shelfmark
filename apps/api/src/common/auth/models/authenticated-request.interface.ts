import type { AuthSessionResponse } from '@shelfmark/contracts';
import type { Request } from 'express';

/** A request after `SessionAuthGuard`: `auth` is set on every non-public route. */
export interface AuthenticatedRequest extends Request {
  auth?: AuthSessionResponse;
}
