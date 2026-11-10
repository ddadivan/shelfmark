import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/auth/models/authenticated-request.interface';
import { readAdminEmails } from '../config/admin-config';

/**
 * Admin routes exist for the author only. The session user's email must be in `ADMIN_EMAILS`;
 * everyone else (a demo user, an empty or unset list included) gets 404, so the route does not
 * reveal itself. Runs after the global guards, which already put the session on the request.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().auth?.user;
    if (!user || user.isDemo || !readAdminEmails().has(user.email.trim().toLowerCase())) {
      throw new NotFoundException();
    }
    return true;
  }
}
