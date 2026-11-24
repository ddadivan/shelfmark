import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ACCOUNT_DELETION,
  type AccountDeletionStatus,
  type AuthUser,
  type DeleteAccountRequest,
  type OnboardingResponse,
  type UpdateUserSettingsRequest,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import type { Prisma } from '../generated/prisma/client';
import { FoldersService } from '../folders/folders.service';
import { PrismaService } from '../prisma/prisma.service';
import { toRetentionDays } from '../trash/trash.service';
import { APPEARANCE_SELECT } from './models/appearance-select.const';
import { LANGUAGE_SELECT } from './models/language-select.const';
import { LIBRARY_SELECT } from './models/library-select.const';
import { READER_SELECT } from './models/reader-select.const';
import { customThemeColumns, toAppearanceSettings } from './to-appearance-settings';
import { toLanguageSettings } from './to-language-settings';
import { toLibrarySettings } from './to-library-settings';
import { readerColumns, toReaderPreferences } from './to-reader-preferences';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly folders: FoldersService,
  ) {}

  /**
   * Schedules the deletion of the session user (Shelf 05-settings): `deletion_scheduled_at` is set
   * `ACCOUNT_DELETION.GraceDays` ahead, or kept when one is already scheduled (a repeat never moves
   * it). Every session of the user is then deleted, so every device is signed out; the controller
   * clears the cookie. Nothing else changes until the purge cron (`AccountPurgeService`) deletes
   * the account for good. The owner always comes from the session, never from the request; a
   * mismatching confirmation is a 400 and schedules nothing.
   */
  async scheduleDeletion(
    user: AuthUser,
    body: DeleteAccountRequest,
  ): Promise<AccountDeletionStatus> {
    if (body.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new BadRequestException('The confirmation does not match the account email');
    }
    const due = new Date(Date.now() + ACCOUNT_DELETION.GraceDays * DAY_MS);
    const [, , row] = await this.prisma.$transaction([
      this.prisma.user.updateMany({
        where: { id: user.id, deletionScheduledAt: null },
        data: { deletionScheduledAt: due },
      }),
      this.prisma.session.deleteMany({ where: { userId: user.id } }),
      this.prisma.user.findUnique({
        where: { id: user.id },
        select: { deletionScheduledAt: true },
      }),
    ]);
    // The user id is an opaque uuid, not personal data; never log the email or name.
    this.logger.log(`Account deletion scheduled: ${user.id}`);
    return { deletionScheduledAt: row?.deletionScheduledAt?.toISOString() ?? null };
  }

  /** When the session user's account will be deleted, or `null`. */
  async deletionStatus(userId: string): Promise<AccountDeletionStatus> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { deletionScheduledAt: true },
    });
    if (!row) throw new NotFoundException();
    return { deletionScheduledAt: row.deletionScheduledAt?.toISOString() ?? null };
  }

  /** "Keep my account": cancels a scheduled deletion of the session user (idempotent). */
  async cancelDeletion(userId: string): Promise<AccountDeletionStatus> {
    const { count } = await this.prisma.user.updateMany({
      where: { id: userId, deletionScheduledAt: { not: null } },
      data: { deletionScheduledAt: null },
    });
    if (count > 0) this.logger.log(`Account deletion cancelled: ${userId}`);
    return { deletionScheduledAt: null };
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
        whatsNewSeen: true,
        ...APPEARANCE_SELECT,
        ...LIBRARY_SELECT,
        ...LANGUAGE_SELECT,
        ...READER_SELECT,
      },
    });
    if (!row) throw new NotFoundException();
    // "New links go to" reads as Unsorted once its folder is gone or in Trash (never another user's).
    const liveFolder =
      row.newLinksFolderId !== null &&
      (await this.prisma.folder.count({
        where: { id: row.newLinksFolderId, userId: user.id, deletedAt: null },
      })) > 0;
    return {
      trashRetentionDays: toRetentionDays(row.trashRetentionDays),
      folderColours: row.folderColours,
      pauseHistory: row.historyPaused,
      ...toAppearanceSettings(row),
      ...toLibrarySettings(row, liveFolder),
      ...toLanguageSettings(row),
      ...toReaderPreferences(row),
      whatsNewSeen: row.whatsNewSeen,
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
    if (request.whatsNewSeen !== undefined) data.whatsNewSeen = request.whatsNewSeen;
    if (request.theme !== undefined) data.theme = request.theme;
    if (request.motion !== undefined) data.motion = request.motion;
    if (request.customColours !== undefined) data.customColours = [...request.customColours];
    if (request.customEmoji !== undefined) data.customEmoji = [...request.customEmoji];
    const layout = {
      textSize: request.textSize,
      font: request.font,
      density: request.density,
      cardPreview: request.cardPreview,
      cardSite: request.cardSite,
      cardNotes: request.cardNotes,
      cardTags: request.cardTags,
    };
    const layoutSent = Object.values(layout).some((value) => value !== undefined);
    // Prisma skips `undefined` fields: only the layout fields sent are written.
    if (layoutSent) Object.assign(data, layout);
    if (
      request.theme !== undefined ||
      request.customTheme !== undefined ||
      request.motion !== undefined ||
      layoutSent
    ) {
      data.appearanceSavedAt = new Date();
    }
    const language = {
      language: request.language,
      dateFormat: request.dateFormat,
      timeFormat: request.timeFormat,
      weekStart: request.weekStart,
    };
    if (Object.values(language).some((value) => value !== undefined)) {
      // Only the fields sent are written (Prisma skips `undefined`); the first write marks them saved.
      Object.assign(data, language, { languageSavedAt: new Date() });
    }
    if (request.customTheme !== undefined)
      Object.assign(data, customThemeColumns(request.customTheme));
    // Reading settings: only the fields sent; the first write marks them saved.
    Object.assign(data, readerColumns(request, new Date()));
    if (request.defaultView !== undefined) data.defaultView = request.defaultView;
    if (request.defaultSort !== undefined) data.defaultSort = request.defaultSort;
    if (request.openLinksIn !== undefined) data.openLinksIn = request.openLinksIn;
    if (request.showFolderCounts !== undefined) data.showFolderCounts = request.showFolderCounts;
    if (request.fetchPreviews !== undefined) data.fetchPreviews = request.fetchPreviews;
    if (request.clickAction !== undefined) data.clickAction = request.clickAction;
    if (request.previewNewTabHosts !== undefined)
      data.previewNewTabHosts = [...request.previewNewTabHosts];
    if (request.newLinksFolderId !== undefined) {
      // A foreign, missing or trashed folder is a 404 (they look the same) and nothing is saved.
      if (request.newLinksFolderId !== null) {
        await this.folders.requireOwned(this.prisma, user.id, request.newLinksFolderId);
      }
      data.newLinksFolderId = request.newLinksFolderId;
    }
    if (Object.keys(data).length > 0) {
      await this.prisma.user.updateMany({ where: { id: user.id }, data });
    }
    return this.getSettings(user);
  }
}
