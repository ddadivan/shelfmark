import { inject, Injector, Service } from '@angular/core';
import { LINK_LIMIT, type RuleOffer } from '@shelfmark/contracts';
import {
  TOAST_CLOSE_REASON,
  TOAST_DURATION_MS,
  TOAST_KIND,
  ToastService,
  type ToastRef,
} from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { pluralKey } from '../../../core/i18n/plural-key';
import { FoldersStore } from '../../../stores/folders.store';
import { RULE_OUTCOME } from '../../../stores/models/rule-outcome.const';
import { RulesStore } from '../../../stores/rules.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { AiSettingsStore } from '../../ai/services/ai-settings.store';
import { toastFolder } from '../../links/utils/toast-folder';
import { RULES_API } from '../models/rules-api.const';
import { RuleActionsService } from './rule-actions.service';
import { Translate } from '../../../core/i18n/translate.service';

/**
 * Rule offers (AI-2, ADR 0050): after the user filed links (Tidy, a move, an edit or a save into a
 * folder they chose) the server is asked whether the newest links of one site share a folder;
 * then a sticky toast offers "Always put {domain} links in {folder}?" with Create rule and Not now.
 * Only while AI is on. When the filing showed an Undo toast, the offer waits until that toast
 * closes for a reason other than Undo, so it never pushes an Undo away. Filings that come while a
 * check waits are merged into the newest one (their toasts replaced each other), so no filing is
 * dropped; while an offer toast is up, a new check is skipped (one question at a time, and an offer
 * never replaces another). Not now and the close button are remembered by the server; a replaced
 * or timed-out toast stores nothing. A domain is not offered again in this session after an answer.
 */
@Service()
export class RuleOfferService {
  private readonly injector = inject(Injector);
  private readonly ai = inject(AiSettingsStore);
  private readonly rules = inject(RulesStore);
  private readonly folders = inject(FoldersStore);
  private readonly settings = inject(UserSettingsStore);
  private readonly toasts = inject(ToastService);
  private readonly translate = inject(Translate);
  /** Domains answered in this session. */
  private readonly answered = new Set<string>();
  /** Filed link ids not checked yet (merged across filings that came while a check waited). */
  private readonly pending = new Set<string>();
  /** The newest filing: only it asks the server. */
  private latest = 0;
  /** The offer toast is up. */
  private offering = false;
  private epoch = 0;

  constructor() {
    inject(SessionScope).onEnd(() => {
      this.epoch++;
      this.answered.clear();
      this.pending.clear();
      this.offering = false;
    });
  }

  /** The user filed `linkIds` (`toast`: the Undo toast of that filing, if any). */
  afterFiling(linkIds: readonly string[], toast?: ToastRef): void {
    if (!this.ai.isOn() || linkIds.length === 0) {
      return;
    }
    for (const id of linkIds) {
      this.pending.add(id);
    }
    void this.check(++this.latest, [...linkIds], toast);
  }

  private async check(turn: number, own: readonly string[], toast?: ToastRef): Promise<void> {
    const epoch = this.epoch;
    const reason = toast ? await toast.closed : null;
    if (epoch !== this.epoch) {
      return;
    }
    if (reason === TOAST_CLOSE_REASON.Action) {
      // This filing was undone: its links no longer count.
      for (const id of own) {
        this.pending.delete(id);
      }
    }
    // A newer filing asks for all pending links once its own toast is gone.
    if (turn !== this.latest) {
      return;
    }
    const linkIds = [...this.pending].slice(-LINK_LIMIT.BatchMax);
    this.pending.clear();
    if (linkIds.length === 0 || this.offering) {
      return;
    }
    let offer: RuleOffer | null;
    try {
      ({ offer } = await firstValueFrom(this.injector.get(RULES_API).checkOffer(linkIds)));
    } catch {
      return;
    }
    if (
      !offer ||
      epoch !== this.epoch ||
      !this.ai.isOn() ||
      this.offering ||
      this.answered.has(offer.domain)
    ) {
      return;
    }
    await this.offer(offer);
  }

  private async offer(offer: RuleOffer): Promise<void> {
    const epoch = this.epoch;
    this.offering = true;
    const folder = this.folders.entityMap()[offer.folderId];
    const ref = this.toasts.show({
      kind: TOAST_KIND.Moved,
      title: this.translate.t('rules.offer.title', {
        domain: offer.domain,
        folder: folder?.name ?? '',
      }),
      detail: this.translate.t(pluralKey('rules.offer.detail', offer.count), {
        count: offer.count,
      }),
      folder: toastFolder(folder, (colour) => this.settings.shownColour(colour)),
      duration: TOAST_DURATION_MS.Sticky,
      action: { label: this.translate.t('rules.offer.create'), run: () => void this.create(offer) },
      secondary: {
        label: this.translate.t('rules.offer.notNow'),
        run: () => void this.notNow(offer),
      },
    });
    const reason = await ref.closed;
    if (epoch === this.epoch) {
      this.offering = false;
    }
    // The close button (or Esc) means "Not now" too; a replaced toast stores nothing.
    if (reason === TOAST_CLOSE_REASON.Dismissed) {
      await this.notNow(offer);
    }
  }

  private async notNow(offer: RuleOffer): Promise<void> {
    this.answered.add(offer.domain);
    await firstValueFrom(this.injector.get(RULES_API).dismissOffer(offer.domain)).catch(
      () => undefined,
    );
  }

  /** Create rule: the rule is saved, then "Apply to Unsorted" files the links already there. */
  private async create(offer: RuleOffer): Promise<void> {
    this.answered.add(offer.domain);
    const result = await this.rules.create({ domain: offer.domain, folderId: offer.folderId });
    const rule = result.outcome === RULE_OUTCOME.Done ? result.rule : undefined;
    if (!rule) {
      this.toasts.show({ kind: TOAST_KIND.Danger, title: this.translate.t('rules.offer.failed') });
      return;
    }
    const actions = this.injector.get(RuleActionsService);
    this.toasts.show({
      kind: TOAST_KIND.Success,
      title: this.translate.t('rules.offer.created'),
      detail: actions.describe(rule),
      action: {
        label: this.translate.t('rules.offer.applyExisting'),
        run: () => void actions.applyToExisting(rule),
      },
    });
  }
}
