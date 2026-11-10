import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/auth/models/authenticated-request.interface';
import { readAdminEmails } from '../config/admin-config';
import { normalizeAdminEmail } from '../config/normalize-admin-email';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Admin routes exist for the author only. The session user's email must be in `ADMIN_EMAILS`, be
 * ASCII, and be verified by the provider (read from the database: the public session shape has no
 * `emailVerified`, and an unverified provider email must not be enough). Everyone else (a demo user,
 * an empty or unset list included) gets 404, so the route does not reveal itself. Runs after the
 * global guards, which already put the session on the request.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().auth?.user;
    const email = user ? normalizeAdminEmail(user.email) : null;
    if (!user || user.isDemo || email === null || !readAdminEmails().has(email)) {
      throw new NotFoundException();
    }
    const stored = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { emailVerified: true },
    });
    if (stored?.emailVerified !== true) throw new NotFoundException();
    return true;
  }
}
