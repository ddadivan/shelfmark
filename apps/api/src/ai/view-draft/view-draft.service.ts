import { ConflictException, Injectable, Logger } from '@nestjs/common';
import {
  AI_ERROR_MESSAGE,
  parseViewDraftOutput,
  VIEW_DRAFT_OUTCOME,
  type AuthUser,
  type ViewDraft,
  type ViewDraftOutcome,
  type ViewDraftResponse,
} from '@shelfmark/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { AskUsageService } from '../ask/ask-usage.service';
import { AiProviderRegistry } from '../providers/ai-provider.registry';
import { AiSettingsService } from '../settings/ai-settings.service';
import { loadViewDraftVocabulary } from './load-view-draft-vocabulary';

/**
 * `POST /api/ai/view-draft` (#535, ADR 0056): a saved view's filter from a phrase. Order: AI on
 * (else 409) → the user's vocabulary → reserve one Ask question (else `quota`) → one model call with
 * the phrase, folder paths and tag names → `parseViewDraftOutput` against the same vocabulary. A
 * failure, refusal or unusable answer refunds the question and answers `unavailable`. Nothing is
 * stored; the log line carries the outcome and duration only, never the phrase or the answer.
 */
@Injectable()
export class ViewDraftService {
  private readonly logger = new Logger(ViewDraftService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AiSettingsService,
    private readonly registry: AiProviderRegistry,
    private readonly usage: AskUsageService,
  ) {}

  async draft(user: AuthUser, phrase: string): Promise<ViewDraftResponse> {
    const started = Date.now();
    const userId = user.id;
    const stored = await this.settings.read(this.prisma, userId);
    if (!stored.settings.enabled) throw new ConflictException(AI_ERROR_MESSAGE.AiOff);
    const { aiTier: tier } = await this.settings.entitlements(this.prisma, userId);
    const vocabulary = await loadViewDraftVocabulary(this.prisma, userId);
    const day = await this.usage.reserve(userId, tier);
    let outcome: ViewDraftOutcome = VIEW_DRAFT_OUTCOME.Quota;
    let draft: ViewDraft | null = null;
    try {
      if (day !== null) {
        draft = await this.ask(user, phrase, vocabulary);
        outcome = draft === null ? VIEW_DRAFT_OUTCOME.Unavailable : VIEW_DRAFT_OUTCOME.Done;
        if (draft === null) await this.usage.refund(userId, day);
      }
    } catch (error) {
      if (day !== null) await this.usage.refund(userId, day);
      throw error;
    } finally {
      this.logger.log(`View draft: ${outcome} in ${Date.now() - started} ms`);
    }
    return { outcome, draft, allowance: await this.usage.allowance(userId, tier) };
  }

  private async ask(
    user: AuthUser,
    phrase: string,
    vocabulary: Awaited<ReturnType<typeof loadViewDraftVocabulary>>,
  ): Promise<ViewDraft | null> {
    const result = await this.registry.for(user).draftView({
      phrase,
      folders: vocabulary.folders.map((folder) => folder.path),
      tags: vocabulary.tags,
    });
    if (result.type !== 'output') return null;
    return parseViewDraftOutput(result.output, vocabulary, phrase);
  }
}
