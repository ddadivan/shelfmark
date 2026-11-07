import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { AuthUser, DeleteAccountRequest } from '@shelfmark/contracts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deletes the session user and all their data in one transaction. The `User` delete cascades to
   * sessions, accounts, folders, links, tags and (through links and tags) link tags. `Verification`
   * has no user relation: its rows are keyed by `identifier`, so those that name the user's email
   * go in the same transaction. The owner always comes from the session, never from the request.
   * A mismatching confirmation is a 400 and deletes nothing.
   */
  async deleteAccount(user: AuthUser, body: DeleteAccountRequest): Promise<void> {
    if (body.email.trim().toLowerCase() !== user.email.toLowerCase()) {
      throw new BadRequestException('The confirmation does not match the account email');
    }
    await this.prisma.$transaction([
      this.prisma.verification.deleteMany({ where: { identifier: user.email } }),
      this.prisma.user.deleteMany({ where: { id: user.id } }),
    ]);
    // The user id is an opaque uuid, not personal data; never log the email or name.
    this.logger.log(`Account deleted: ${user.id}`);
  }
}
