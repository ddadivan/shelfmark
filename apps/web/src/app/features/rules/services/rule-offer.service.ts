import { inject, Injector, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { RuleOffer } from '@shelfmark/contracts';
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

/**
 * Rule offers (AI-2, ADR 0049): after the user filed links (Tidy, a move, an edit or a save into a
 * folder they chose) the server is asked whether the newest links of one site share a folder;
 * then a sticky toast offers "Always put {domain} links in {folder}?" with Create rule and Not now.
 * Only while AI is on. When the filing showed an Undo toast, the offer waits until that toast
 * closes for a reason other than Undo, so it never pushes an Undo away. Not now and the close
 * button are remembered by the server; a replaced or timed-out toast stores nothing. At most one
 * check runs at a time, and a domain is not offered again in this session after an answer.
 */
@Service()
export class RuleOfferService {
  private readonly injector = inject(Injector);
  private readonly ai = inject(AiSettingsStore);
  private readonly rules = inject(RulesStore);
  private readonly folders = inject(FoldersStore);
  private readonly settings = inject(UserSettingsStore);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  /** Domains answered in this session. */
  private readonly answered = new Set<string>();
  private busy = false;
  private epoch = 0;

  constructor() {
    inject(SessionScope).onEnd(() => {
      this.epoch++;
      this.answered.clear();
      this.busy = false;
    });
  }

  /** The user filed `linkIds` (`toast`: the Undo toast of that filing, if any). */
  afterFiling(linkIds: readonly string[], toast?: ToastRef): void {
    if (!this.ai.isOn() || linkIds.length === 0 || this.busy) {
      return;
    }
    this.busy = true;
    const epoch = this.epoch;
    void this.check([...linkIds], toast).finally(() => {
      if (epoch === this.epoch) {
        this.busy = false;
      }
    });
  }

  private async check(linkIds: string[], toast?: ToastRef): Promise<void> {
    const epoch = this.epoch;
    if (toast && (await toast.closed) === TOAST_CLOSE_REASON.Action) {
      return;
    }
    let offer: RuleOffer | null;
    try {
      ({ offer } = await firstValueFrom(this.injector.get(RULES_API).checkOffer(linkIds)));
    } catch {
      return;
    }
    if (!offer || epoch !== this.epoch || !this.ai.isOn() || this.answered.has(offer.domain)) {
      return;
    }
    await this.offer(offer);
  }

  private async offer(offer: RuleOffer): Promise<void> {
    const folder = this.folders.entityMap()[offer.folderId];
    const ref = this.toasts.show({
      kind: TOAST_KIND.Moved,
      title: this.t('rules.offer.title', { domain: offer.domain, folder: folder?.name ?? '' }),
      detail: this.t(pluralKey('rules.offer.detail', offer.count), { count: offer.count }),
      folder: toastFolder(folder, (colour) => this.settings.shownColour(colour)),
      duration: TOAST_DURATION_MS.Sticky,
      action: { label: this.t('rules.offer.create'), run: () => void this.create(offer) },
      secondary: { label: this.t('rules.offer.notNow'), run: () => void this.notNow(offer) },
    });
    // The close button (or Esc) means "Not now" too; a replaced toast stores nothing.
    if ((await ref.closed) === TOAST_CLOSE_REASON.Dismissed) {
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
      this.toasts.show({ kind: TOAST_KIND.Danger, title: this.t('rules.offer.failed') });
      return;
    }
    const actions = this.injector.get(RuleActionsService);
    this.toasts.show({
      kind: TOAST_KIND.Success,
      title: this.t('rules.offer.created'),
      detail: actions.describe(rule),
      action: {
        label: this.t('rules.offer.applyExisting'),
        run: () => void actions.applyToExisting(rule),
      },
    });
  }

  private t(key: string, params?: Record<string, unknown>): string {
    return this.transloco.translate(key, params);
  }
}
