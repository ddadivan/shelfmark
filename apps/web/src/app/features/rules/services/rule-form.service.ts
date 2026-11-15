import { inject, Service, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, required, validate, type ValidationError } from '@angular/forms/signals';
import { TranslocoService } from '@jsverse/transloco';
import {
  normalizeRuleDomain,
  RULE_LIMIT,
  type CreateRuleRequest,
  type RuleResponse,
} from '@shelfmark/contracts';
import { injectDialogData, UiDialogRef } from '@shelfmark/ui';
import { RULE_OUTCOME } from '../../../stores/models/rule-outcome.const';
import { RulesStore } from '../../../stores/rules.store';
import { FoldersStore } from '../../../stores/folders.store';
import { normalizeTagNames } from '../../tags/utils/normalize-tag-names';
import type { RuleDialogData } from '../models/rule-dialog-data.interface';
import type { RuleFormModel } from '../models/rule-form-model.interface';
import { RULE_OUTCOME_KEYS } from '../models/rule-outcome-keys.const';

/**
 * Form state and save flow of the rule dialog (provided by the dialog, one per dialog): the
 * domain (validated and shown the way it is stored), the folder and the tags. A rule needs a
 * folder or a tag; the server's answer (taken domain, limit, folder gone) stays in the dialog.
 * Closes with the saved rule.
 */
@Service({ autoProvided: false })
export class RuleFormService {
  private readonly transloco = inject(TranslocoService);
  private readonly store = inject(RulesStore);
  private readonly folders = inject(FoldersStore);
  private readonly ref = inject<UiDialogRef<RuleResponse>>(UiDialogRef);
  readonly data = injectDialogData<RuleDialogData>();
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  readonly editing = this.data.rule !== undefined;
  readonly saving = signal(false);
  /** Translation key of the notice under the fields; `null` while there is none. */
  readonly errorKey = signal<string | null>(null);

  readonly model = signal<RuleFormModel>({
    domain: this.data.rule?.domain ?? normalizeRuleDomain(this.data.domain ?? '') ?? '',
    // A folder in Trash is not offered by the picker: the edit starts without it (a notice says so).
    folderId: this.data.rule?.folderAvailable ? this.data.rule.folderId : null,
    tags: [...(this.data.rule?.tags ?? [])],
  });

  readonly form = form(
    this.model,
    (path) => {
      required(path.domain, { message: () => this.text('rules.dialog.domain.required') });
      validate(path.domain, ({ value }): ValidationError.WithoutFieldTree | undefined =>
        value().trim() === '' || normalizeRuleDomain(value()) !== null
          ? undefined
          : { kind: 'domain', message: this.text('rules.dialog.domain.invalid') },
      );
      validate(path.tags, ({ value }): ValidationError.WithoutFieldTree | undefined =>
        value().length > RULE_LIMIT.TagsMax
          ? {
              kind: 'maxTags',
              message: this.text('rules.dialog.tags.max', { max: RULE_LIMIT.TagsMax }),
            }
          : undefined,
      );
    },
    {
      submission: {
        action: () => this.save(),
        onInvalid: () => {
          this.form().errorSummary()[0]?.fieldTree().focusBoundControl();
        },
      },
    },
  );

  /** Shows the domain the way it will be stored once the field is left (`https://www.X/` → `X`). */
  normalizeDomainField(): void {
    const field = this.form.domain();
    const domain = normalizeRuleDomain(field.value());
    if (domain !== null && domain !== field.value()) {
      field.value.set(domain);
    }
  }

  chooseFolder(folderId: string | null): void {
    this.model.update((model) => ({ ...model, folderId }));
    this.errorKey.set(null);
  }

  cancel(): void {
    this.ref.close();
  }

  private async save(): Promise<undefined> {
    if (this.saving()) {
      return;
    }
    const { domain, folderId, tags } = this.model();
    const names = [...normalizeTagNames(tags)];
    const folder = folderId !== null && this.folders.entityMap()[folderId] ? folderId : null;
    if (folder === null && names.length === 0) {
      this.errorKey.set('rules.dialog.nothing');
      return;
    }
    const request: CreateRuleRequest = { domain: domain.trim(), folderId: folder, tags: names };
    this.saving.set(true);
    this.errorKey.set(null);
    const rule = this.data.rule;
    const result = rule
      ? await this.store.update(rule.id, request)
      : await this.store.create(request);
    if (result.outcome === RULE_OUTCOME.Done && result.rule) {
      // `saving` stays on: the button keeps its spinner while the dialog leaves.
      this.ref.close(result.rule);
      return;
    }
    this.saving.set(false);
    this.errorKey.set(
      RULE_OUTCOME_KEYS[
        result.outcome === RULE_OUTCOME.Done ? RULE_OUTCOME.Failed : result.outcome
      ],
    );
  }

  private text(key: string, params?: Record<string, unknown>): string {
    this.i18n();
    return this.transloco.translate(key, params);
  }
}
