import { inject, Service } from '@angular/core';
import { normalizeRuleDomain, type RuleResponse } from '@shelfmark/contracts';
import {
  DIALOG_SIZE,
  DIALOG_VARIANT,
  DialogService,
  TOAST_KIND,
  ToastService,
} from '@shelfmark/ui';
import { pluralKey } from '../../../core/i18n/plural-key';
import { UndoToastService } from '../../../core/undo/undo-toast.service';
import { DIALOG_FIRST_FIELD } from '../../../models/dialog-first-field.const';
import { FoldersStore } from '../../../stores/folders.store';
import { RulesStore } from '../../../stores/rules.store';
import { RuleDialogComponent } from '../components/rule-dialog/rule-dialog.component';
import type { RuleDialogData } from '../models/rule-dialog-data.interface';
import { RuleApplyService } from './rule-apply.service';
import { Translate } from '../../../core/i18n/translate.service';

/**
 * What can be done with a domain rule (#398): add (also prefilled from a link's menu), edit,
 * delete (hidden at once, sent when the Undo window ends) and "Apply to existing links" (the
 * matches in Unsorted, a confirm with their number, the bulk update, a toast with Undo).
 */
@Service()
export class RuleActionsService {
  private readonly store = inject(RulesStore);
  private readonly folders = inject(FoldersStore);
  private readonly applier = inject(RuleApplyService);
  private readonly dialogs = inject(DialogService);
  private readonly toasts = inject(ToastService);
  private readonly undoToast = inject(UndoToastService);
  private readonly translate = inject(Translate);

  /** "Add rule", or "Create a rule for youtube.com…" with the domain of a link. */
  async create(url?: string): Promise<RuleResponse | null> {
    await this.store.load();
    const domain = url === undefined ? undefined : (normalizeRuleDomain(url) ?? undefined);
    const existing =
      domain === undefined ? undefined : this.store.items().find((rule) => rule.domain === domain);
    if (existing) {
      // The domain has a rule already: open it instead of failing on save.
      return this.edit(existing);
    }
    if (this.store.atLimit()) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.translate.t('rules.limit.title'),
        detail: this.translate.t('rules.dialog.limit'),
      });
      return null;
    }
    const rule = await this.open({ ...(domain !== undefined && { domain }) });
    if (rule) {
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.translate.t('rules.created.title'),
        detail: this.describe(rule),
      });
    }
    return rule;
  }

  async edit(rule: RuleResponse): Promise<RuleResponse | null> {
    const saved = await this.open({ rule });
    if (saved) {
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.translate.t('rules.saved.title'),
        detail: this.describe(saved),
      });
    }
    return saved;
  }

  /** Hides the rule at once; Undo puts it back, else the delete is sent when the toast closes. */
  delete(rule: RuleResponse): void {
    if (this.store.hide(rule.id) === null) {
      return;
    }
    this.undoToast.show({
      title: this.translate.t('rules.deleted.title'),
      detail: rule.domain,
      actionLabel: this.translate.t('rules.undo'),
      onUndo: () => this.store.putBack(rule),
      onExpire: () => void this.commitDelete(rule),
    });
  }

  /** Files the rule's matches in Unsorted after a confirm with their number; a toast offers Undo. */
  async applyToExisting(rule: RuleResponse): Promise<void> {
    const found = await this.store.matches(rule.id);
    if (found === null) {
      this.failed('rules.apply.failed');
      return;
    }
    if (found.total === 0) {
      this.toasts.show({
        kind: TOAST_KIND.Info,
        title: this.translate.t('rules.apply.none', { domain: rule.domain }),
      });
      return;
    }
    const count = found.items.length;
    const confirmed = await this.dialogs.confirm({
      title: this.translate.t('rules.apply.title', { domain: rule.domain }),
      message: [
        this.translate.t(pluralKey('rules.apply.message', count), {
          count,
          target: this.describe(rule),
        }),
        ...(found.total > count
          ? [this.translate.t('rules.apply.more', { total: found.total })]
          : []),
      ].join(' '),
      confirmLabel: this.translate.t(pluralKey('rules.apply.confirm', count), { count }),
      cancelLabel: this.translate.t('rules.apply.cancel'),
      closeLabel: this.translate.t('rules.dialog.close'),
    });
    if (!confirmed) {
      return;
    }
    if (!(await this.applier.apply(rule, found.items))) {
      this.failed('rules.apply.failed');
      return;
    }
    const undo = this.translate.t('rules.undo');
    this.undoToast.show({
      kind: TOAST_KIND.Success,
      title: this.translate.t(pluralKey('rules.apply.done', count), { count }),
      detail: this.describe(rule),
      actionLabel: undo,
      onUndo: () =>
        void this.applier.undo(rule, found.items).then((done) => {
          if (!done) {
            this.failed('rules.apply.undoFailed');
          }
        }),
    });
  }

  /** "youtube.com: Videos, video" — the rule as one line for toasts and the confirm. */
  describe(rule: RuleResponse): string {
    const folderId = this.applier.folderOf(rule);
    const folder = folderId === null ? null : (this.folders.entityMap()[folderId]?.name ?? null);
    const parts = [...(folder === null ? [] : [folder]), ...rule.tags.map((tag) => `#${tag}`)];
    return this.translate.t('rules.describe', { domain: rule.domain, target: parts.join(', ') });
  }

  private async open(data: RuleDialogData): Promise<RuleResponse | null> {
    const ref = this.dialogs.open<RuleDialogComponent, RuleResponse, RuleDialogData>(
      RuleDialogComponent,
      // Shelf: the rule editor is the side panel (04-organise "Edit rule").
      { size: DIALOG_SIZE.Md, variant: DIALOG_VARIANT.Panel, autoFocus: DIALOG_FIRST_FIELD, data },
    );
    return (await ref.result) ?? null;
  }

  private async commitDelete(rule: RuleResponse): Promise<void> {
    if (!(await this.store.remove(rule.id))) {
      this.store.putBack(rule);
      this.failed('rules.deleteFailed');
    }
  }

  private failed(key: string): void {
    this.toasts.show({ kind: TOAST_KIND.Danger, title: this.translate.t(key) });
  }
}
