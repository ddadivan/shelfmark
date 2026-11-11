import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  AuthUser,
  DeleteAccountRequest,
  OnboardingResponse,
  UpdateUserSettingsRequest,
  UserSettingsResponse,
} from '@shelfmark/contracts';
import type { Prisma } from '../generated/prisma/client';
import { FoldersService } from '../folders/folders.service';
import { PrismaService } from '../prisma/prisma.service';
import { toRetentionDays } from '../trash/trash.service';
import { APPEARANCE_SELECT } from './models/appearance-select.const';
import { LANGUAGE_SELECT } from './models/language-select.const';
import { LIBRARY_SELECT } from './models/library-select.const';
import { customThemeColumns, toAppearanceSettings } from './to-appearance-settings';
import { toLanguageSettings } from './to-language-settings';
import { toLibrarySettings } from './to-library-settings';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly folders: FoldersService,
  ) {}

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
        ...LIBRARY_SELECT,
        ...LANGUAGE_SELECT,
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
      spellcheck: request.spellcheck,
    };
    if (Object.values(language).some((value) => value !== undefined)) {
      // Only the fields sent are written (Prisma skips `undefined`); the first write marks them saved.
      Object.assign(data, language, { languageSavedAt: new Date() });
    }
    if (request.customTheme !== undefined)
      Object.assign(data, customThemeColumns(request.customTheme));
    if (request.defaultView !== undefined) data.defaultView = request.defaultView;
    if (request.defaultSort !== undefined) data.defaultSort = request.defaultSort;
    if (request.openLinksIn !== undefined) data.openLinksIn = request.openLinksIn;
    if (request.showFolderCounts !== undefined) data.showFolderCounts = request.showFolderCounts;
    if (request.warnDuplicates !== undefined) data.warnDuplicates = request.warnDuplicates;
    if (request.fetchPreviews !== undefined) data.fetchPreviews = request.fetchPreviews;
    if (request.keepQuery !== undefined) data.keepQuery = request.keepQuery;
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

  /** Clears the flag so the onboarding shows again. Idempotent. */
  async resetOnboarding(user: AuthUser): Promise<void> {
    await this.prisma.user.updateMany({
      where: { id: user.id },
      data: { onboardingCompletedAt: null },
    });
  }
}
