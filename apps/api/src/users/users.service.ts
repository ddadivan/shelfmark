import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  AuthUser,
  DeleteAccountRequest,
  OnboardingResponse,
  UpdateUserSettingsRequest,
  UserSettingsResponse,
} from '@shelfmark/contracts';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toRetentionDays } from '../trash/trash.service';
import { APPEARANCE_SELECT } from './models/appearance-select.const';
import { customThemeColumns, toAppearanceSettings } from './to-appearance-settings';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deletes the session user and all their data in one transaction. The `User` delete cascades to
   * sessions, accounts, folders, links, tags and (through links and tags) link tags.
   * `Verification` has no user relation: its rows are keyed by `identifier`, so rows whose
   * `identifier` equals the user's email (case-insensitive) go in the same transaction. The owner
   * always comes from the session, never from the request. A mismatching confirmation is a 400
   * and deletes nothing; a failing transaction propagates (500) and deletes nothing.
   */
  async deleteAccount(user: AuthUser, body: DeleteAccountRequest): Promise<void> {
    if (body.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new BadRequestException('The confirmation does not match the account email');
    }
    await this.prisma.$transaction([
      this.prisma.verification.deleteMany({
        where: { identifier: { equals: user.email, mode: 'insensitive' } },
      }),
      this.prisma.user.deleteMany({ where: { id: user.id } }),
    ]);
    // The user id is an opaque uuid, not personal data; never log the email or name.
    this.logger.log(`Account deleted: ${user.id}`);
  }

  /**
   * Marks the onboarding as done for the session user. Idempotent: the first call stamps `now()`,
   * later calls keep that timestamp and return it. The owner comes from the session only.
   */
  async completeOnboarding(user: AuthUser): Promise<OnboardingResponse> {
    await this.prisma.user.updateMany({
      where: { id: user.id, onboardingCompletedAt: null },
      data: { onboardingCompletedAt: new Date() },
    });
    const row = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { onboardingCompletedAt: true },
    });
    if (!row?.onboardingCompletedAt) throw new NotFoundException();
    return { onboardingCompletedAt: row.onboardingCompletedAt.toISOString() };
  }

  /** Account preferences of the session user (demo users too). */
  async getSettings(user: AuthUser): Promise<UserSettingsResponse> {
    const row = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        trashRetentionDays: true,
        folderColours: true,
        historyPaused: true,
        ...APPEARANCE_SELECT,
      },
    });
    if (!row) throw new NotFoundException();
    return {
      trashRetentionDays: toRetentionDays(row.trashRetentionDays),
      folderColours: row.folderColours,
      pauseHistory: row.historyPaused,
      ...toAppearanceSettings(row),
    };
  }

  /** Changes only the fields sent; the owner is the session user, never the request. */
  async updateSettings(
    user: AuthUser,
    request: UpdateUserSettingsRequest,
  ): Promise<UserSettingsResponse> {
    const data: Prisma.UserUpdateManyMutationInput = {};
    if (request.trashRetentionDays !== undefined)
      data.trashRetentionDays = request.trashRetentionDays;
    if (request.folderColours !== undefined) data.folderColours = request.folderColours;
    if (request.pauseHistory !== undefined) data.historyPaused = request.pauseHistory;
    if (request.theme !== undefined) data.theme = request.theme;
    if (request.motion !== undefined) data.motion = request.motion;
    if (
      request.theme !== undefined ||
      request.customTheme !== undefined ||
      request.motion !== undefined
    ) {
      data.appearanceSavedAt = new Date();
    }
    if (request.customTheme !== undefined)
      Object.assign(data, customThemeColumns(request.customTheme));
    if (Object.keys(data).length > 0) {
      await this.prisma.user.updateMany({ where: { id: user.id }, data });
    }
    return this.getSettings(user);
  }

  /** Clears the flag so the onboarding shows again. Idempotent. */
  async resetOnboarding(user: AuthUser): Promise<void> {
    await this.prisma.user.updateMany({
      where: { id: user.id },
      data: { onboardingCompletedAt: null },
    });
  }
}
