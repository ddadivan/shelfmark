import { inject, Service } from '@angular/core';
import { injectDialogData } from '@shelfmark/ui';
import { RuleSuggestionService } from '../../rules/services/rule-suggestion.service';
import type { AddLinkDialogData } from '../models/add-link-dialog-data.interface';
import { AddLinkFormService } from './add-link-form.service';

/**
 * Domain rules in the add-link dialog (#398, provided by the dialog): plugs the form into
 * `RuleSuggestionService`. A folder the user picked, or the folder the dialog was opened in, wins
 * over the rule's; so do tags the user chose. Edit mode applies no rules.
 */
@Service({ autoProvided: false })
export class AddLinkRuleService {
  private readonly suggestion = inject(RuleSuggestionService);
  private readonly formState = inject(AddLinkFormService);
  private readonly data = injectDialogData<AddLinkDialogData>();

  readonly chip = this.suggestion.chip;
  readonly handled = this.suggestion.handled;

  constructor() {
    if (this.formState.editing) {
      return;
    }
    this.suggestion.connect({
      url: () => this.formState.url(),
      read: () => this.formState.model(),
      put: (fields) =>
        this.formState.model.update((model) => ({
          ...model,
          folderId: fields.folderId,
          tags: [...fields.tags],
        })),
      locked: () => ({
        folder: this.formState.form.folderId().dirty() || this.data.folderId !== undefined,
        tags: this.formState.form.tags().dirty(),
      }),
    });
  }

  dismiss(): void {
    this.suggestion.dismiss();
  }
}
