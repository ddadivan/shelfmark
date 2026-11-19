import { computed, inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { SelectOption, TagSuggestion } from '@shelfmark/ui';
import { LocaleService } from '../../../core/i18n/locale.service';
import { pluralKey } from '../../../core/i18n/plural-key';
import { TagsStore } from '../../../stores/tags.store';
import { linkKindOptions } from '../utils/link-kind-options';
import { ReminderFormatService } from '../../reminders/services/reminder-format.service';
import { AddLinkFormService } from './add-link-form.service';

/**
 * The translated labels of the add-link dialog (provided by the dialog): the "Type" options and
 * tag suggestions, and in edit mode the reminder chip and the "Saved X, last opened Y" line. Each
 * follows a language switch through `AddLinkFormService.i18n`.
 */
@Service({ autoProvided: false })
export class AddLinkLabelsService {
  private readonly formState = inject(AddLinkFormService);
  private readonly tagStore = inject(TagsStore);
  private readonly transloco = inject(TranslocoService);
  private readonly localeService = inject(LocaleService);
  private readonly reminderFormat = inject(ReminderFormatService);
  private readonly original = this.formState.original;

  /** Edit mode: the "Type" select, the ten kinds with their icons (#537). */
  readonly kindOptions = computed<SelectOption[]>(() => {
    this.formState.i18n();
    return linkKindOptions((key) => this.transloco.translate(key));
  });

  readonly tagSuggestions = computed<TagSuggestion[]>(() => {
    this.formState.i18n();
    return this.tagStore.entities().map((tag) => ({
      name: tag.name,
      countLabel: this.transloco.translate(pluralKey('tags.count', tag.linkCount), {
        count: tag.linkCount,
      }),
    }));
  });

  /** Edit mode: the link's reminder ("Sat, 10:00", "Due 2 hours ago"), or `null` without one. */
  readonly reminder = computed(() => {
    this.formState.i18n();
    const at = this.original?.remindAt;
    return at ? this.reminderFormat.chip(at) : null;
  });

  /** "Saved X, last opened Y" under the form (edit mode). */
  readonly meta = computed(() => {
    this.formState.i18n();
    const link = this.original;
    if (!link) {
      return null;
    }
    const now = Date.now();
    const created = this.localeService.formatRelative(link.createdAt, now);
    return link.lastOpenedAt === null
      ? this.transloco.translate('links.edit.metaNever', { created })
      : this.transloco.translate('links.edit.meta', {
          created,
          opened: this.localeService.formatRelative(link.lastOpenedAt, now),
        });
  });
}
