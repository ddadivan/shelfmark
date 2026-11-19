import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { computed, inject, Injector, Service, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import {
  ASK_PERIOD,
  VIEW_DRAFT_LIMIT,
  VIEW_DRAFT_OUTCOME,
  type AskAllowance,
} from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { LocaleService } from '../../../core/i18n/locale.service';
import { FoldersStore } from '../../../stores/folders.store';
import { TagsStore } from '../../../stores/tags.store';
import { AI_API } from '../../ai/models/ai-api.const';
import { AiSettingsStore } from '../../ai/services/ai-settings.store';
import { aiResetDate } from '../../ai/utils/ai-reset-date';
import { NEW_VIEW_COMPOSE } from '../models/new-view-compose.const';
import type { NewViewCompose } from '../models/new-view-compose.type';
import { NEW_VIEW_STEP } from '../models/new-view-step.const';
import type { NewViewStep } from '../models/new-view-step.type';
import type { NewViewLine } from '../models/new-view-line.interface';
import type { ViewIdea } from '../models/view-idea.interface';
import { isPhraseValid, normalizePhrase } from '../utils/new-view-phrase';
import { viewIdeas } from '../utils/view-ideas';
import { NewViewFormService } from './new-view-form.service';

const NO_PARAMS: Record<string, string> = {};

/**
 * The AI half of the new view dialog (provided by the dialog): the phrase step, the idea chips,
 * "Compose" and what comes back. Everything shows only while AI is on. A draft fills the rows
 * (`NewViewFormService.applyDraft`); the limit and "not available" are lines, never toasts, and a
 * failure never blocks the dialog: the rows can always be filled by hand.
 */
@Service({ autoProvided: false })
export class NewViewPhraseService {
  private readonly injector = inject(Injector);
  private readonly settings = inject(AiSettingsStore);
  private readonly formState = inject(NewViewFormService);
  private readonly tagStore = inject(TagsStore);
  private readonly folderStore = inject(FoldersStore);
  private readonly transloco = inject(TranslocoService);
  private readonly locale = inject(LocaleService);

  /** AI is on: nothing of the phrase renders otherwise. */
  readonly on = this.settings.isOn;
  readonly step = signal<NewViewStep>(NEW_VIEW_STEP.Phrase);
  readonly state = signal<NewViewCompose>(NEW_VIEW_COMPOSE.Idle);
  /** The phrase field and its ideas show; the rows wait for the first draft or "save the current filter". */
  readonly showPhrase = computed(() => this.on() && this.step() === NEW_VIEW_STEP.Phrase);
  readonly composing = computed(() => this.state() === NEW_VIEW_COMPOSE.Composing);
  /** The rows hold a draft: the phrase shows as one line with "Change". */
  readonly composed = computed(() => this.on() && this.state() === NEW_VIEW_COMPOSE.Done);
  readonly canCompose = computed(() => isPhraseValid(this.formState.model().phrase));

  /** What the filter could not say, one line in the phrase's language. */
  readonly note = signal<string | null>(null);
  /** Names that did not fit (tags past the limit, search words past the limit). */
  readonly dropped = signal<readonly string[]>([]);
  private readonly allowance = signal<AskAllowance | null>(null);

  /** Up to three: the user's biggest tags and folders. */
  readonly ideas = computed<ViewIdea[]>(() =>
    viewIdeas(this.tagStore.entities(), this.folderStore.entities()),
  );

  /** The limit line or "not available", in place of a draft. */
  readonly line = computed<NewViewLine | null>(() => {
    this.formState.i18n();
    switch (this.state()) {
      case NEW_VIEW_COMPOSE.Quota: {
        const allowance = this.allowance();
        return {
          key: allowance?.period === ASK_PERIOD.Day ? 'ai.ask.limit.day' : 'ai.ask.limit.month',
          params: { date: this.resetDate(allowance?.resetsOn ?? '') },
        };
      }
      case NEW_VIEW_COMPOSE.Unavailable:
        return { key: 'views.new.unavailable', params: NO_PARAMS };
      default:
        return null;
    }
  });

  /** A tap on an idea chip: the phrase becomes "Links about <name>". */
  useIdea(idea: ViewIdea): void {
    const phrase = this.transloco
      .translate('views.new.ideaPhrase', { name: idea.name })
      .slice(0, VIEW_DRAFT_LIMIT.PhraseMax);
    this.formState.model.update((model) => ({ ...model, phrase }));
    this.state.set(NEW_VIEW_COMPOSE.Idle);
  }

  /** "Save the current filter": the rows, as they are, without a phrase. */
  skip(): void {
    this.step.set(NEW_VIEW_STEP.Rows);
  }

  /** "Change": back to the phrase; the rows keep what they hold until the next draft. */
  edit(): void {
    this.step.set(NEW_VIEW_STEP.Phrase);
    this.state.set(NEW_VIEW_COMPOSE.Idle);
  }

  /** "Compose": one request, one Ask question; resolves when the answer is in. */
  async compose(): Promise<void> {
    if (!this.on() || this.composing() || !this.canCompose()) {
      return;
    }
    const phrase = normalizePhrase(this.formState.model().phrase);
    this.state.set(NEW_VIEW_COMPOSE.Composing);
    this.formState.phraseLocked.set(true);
    try {
      const response = await firstValueFrom(this.injector.get(AI_API).draftView(phrase));
      this.allowance.set(response.allowance);
      this.settings.askAllowanceSeen(response.allowance);
      if (response.outcome === VIEW_DRAFT_OUTCOME.Done && response.draft !== null) {
        this.formState.applyDraft(response.draft);
        this.note.set(response.draft.note);
        this.dropped.set(response.draft.dropped);
        this.state.set(NEW_VIEW_COMPOSE.Done);
        this.step.set(NEW_VIEW_STEP.Rows);
      } else {
        this.state.set(
          response.outcome === VIEW_DRAFT_OUTCOME.Quota
            ? NEW_VIEW_COMPOSE.Quota
            : NEW_VIEW_COMPOSE.Unavailable,
        );
      }
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.Conflict) {
        // AI was turned off elsewhere: the settings say so now, the phrase goes away.
        void this.settings.refresh();
      }
      this.state.set(NEW_VIEW_COMPOSE.Unavailable);
    } finally {
      this.formState.phraseLocked.set(false);
    }
  }

  private resetDate(iso: string): string {
    const date = aiResetDate(iso);
    return date === null ? '' : this.locale.formatDate(date);
  }
}
