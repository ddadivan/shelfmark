import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthUser } from '@shelfmark/contracts';
import type { AuthenticatedRequest } from './models/authenticated-request.interface';

/** Reads the user `SessionAuthGuard` put on the request; fails closed when there is none. */
export function readCurrentUser(ctx: ExecutionContext): AuthUser {
  const user = ctx.switchToHttp().getRequest<AuthenticatedRequest>().auth?.user;
  if (!user) throw new UnauthorizedException();
  return user;
}

/**
 * The signed-in user of the session. Handlers take the owner of user data from here (`user.id`),
 * never from the body, params or query. Must not be used on a public route.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) =>
  readCurrentUser(ctx),
);
