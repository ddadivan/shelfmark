import { computed, inject, Injector, Service, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { LinkResponse } from '@shelfmark/contracts';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { LocaleService } from '../../../core/i18n/locale.service';
import { RemindersStore } from '../../../stores/reminders.store';
import { REMINDERS_API } from '../../reminders/models/reminders-api.const';
import type { RemindOption } from '../../reminders/models/remind-option.interface';
import { ReminderFormatService } from '../../reminders/services/reminder-format.service';
import { remindPresets } from '../../reminders/utils/remind-presets';
import { LINKS_API } from '../models/links-api.const';

/**
 * "Remind me…" and "Favorite" of the Add link panel (Shelf `02-save-revisit.html`; dialog-scoped).
 * The create request has neither, so they are kept here and applied once the link is saved: the
 * favorite through `PATCH /api/links/:id`, the reminder through `PUT /api/reminders/:linkId`. A
 * failed follow-up leaves the link saved and says what was not set.
 */
@Service({ autoProvided: false })
export class AddLinkExtrasService {
  private readonly links = inject(LINKS_API);
  // Read when a reminder is applied: a dialog without one never needs the reminder seam.
  private readonly injector = inject(Injector);
  private readonly format = inject(ReminderFormatService);
  private readonly locale = inject(LocaleService);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  /** The chosen reminder (ISO), or `null`. */
  readonly remindAt = signal<string | null>(null);
  readonly favorite = signal(false);
  /** The presets offered while the panel is open (one "now" for all of them). */
  readonly presets: readonly RemindOption[] = remindPresets(new Date());
  /** "Tomorrow, 9:00" for the chosen reminder. */
  readonly remindLabel = computed(() => {
    this.locale.lang();
    const at = this.remindAt();
    return at === null ? null : this.format.when(at);
  });

  hint(option: RemindOption): string {
    return this.format.when(option.at.toISOString());
  }

  choose(option: RemindOption | null): void {
    this.remindAt.set(option === null ? null : option.at.toISOString());
  }

  toggleFavorite(): void {
    this.favorite.update((on) => !on);
  }

  /** After the create: the favorite and the reminder; resolves with the link as it is then. */
  async apply(saved: LinkResponse): Promise<LinkResponse> {
    let link = saved;
    if (this.favorite() && !link.isFavorite) {
      try {
        link = await firstValueFrom(this.links.update(link.id, { isFavorite: true }));
      } catch {
        this.warn('links.add.extras.favoriteFailed', link);
      }
    }
    const remindAt = this.remindAt();
    if (remindAt !== null) {
      try {
        link = await firstValueFrom(this.injector.get(REMINDERS_API).set(link.id, remindAt));
        void this.injector.get(RemindersStore).refresh();
      } catch {
        this.warn('links.add.extras.remindFailed', link);
      }
    }
    return link;
  }

  private warn(key: string, link: LinkResponse): void {
    this.toasts.show({
      kind: TOAST_KIND.Warn,
      title: this.transloco.translate(key),
      detail: link.title,
    });
  }
}
