import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LINK_BATCH_ERROR_CODE, type LinkBatchErrorCode } from '@shelfmark/contracts';
import { BUTTON_VARIANT, ButtonComponent, FaviconComponent } from '@shelfmark/ui';
import { PopupStore } from '../../popup.store';
import { pluralKey } from '../../utils/plural-key';

/**
 * State 2 for All tabs (#569): the stack of three cards lands, "N links saved to <folder>" (a neutral
 * line when AI spread them over several folders), "Close N saved tabs" (never automatic) and, when the
 * API skipped some, those tabs with a short reason.
 */
@Component({
  selector: 'ext-popup-saved-tabs',
  templateUrl: './popup-saved-tabs.component.html',
  styleUrl: './popup-saved-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ext-screen', '(keydown.escape)': 'store.close()' },
  imports: [ButtonComponent, FaviconComponent, TranslocoPipe],
})
export class PopupSavedTabsComponent {
  protected readonly store = inject(PopupStore);
  private readonly transloco = inject(TranslocoService);
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;

  protected readonly result = computed(() => this.store.savedTabs());
  protected readonly savedCount = computed(() => this.result()?.saved.length ?? 0);
  protected readonly skipped = computed(() => this.result()?.skipped ?? []);

  protected readonly title = computed(() => {
    const result = this.result();
    if (result === null) return '';
    const count = result.saved.length;
    if (result.skipped.length > 0) {
      return this.transloco.translate('popup.savedTabs.partial', {
        saved: count,
        total: count + result.skipped.length,
      });
    }
    const lang = this.transloco.getActiveLang();
    const [only] = result.folderIds;
    if (result.folderIds.length !== 1 || only === undefined) {
      return this.transloco.translate(pluralKey('popup.savedTabs.titleMixed', count, lang), {
        count,
      });
    }
    const folder = this.store.folders().find((candidate) => candidate.id === only);
    return this.transloco.translate(pluralKey('popup.savedTabs.title', count, lang), {
      count,
      folder: folder?.name ?? this.transloco.translate('popup.unsorted'),
    });
  });
  protected readonly skippedText = computed(() => {
    const count = this.skipped().length;
    return this.transloco.translate(
      pluralKey('popup.savedTabs.skipped', count, this.transloco.getActiveLang()),
      { count },
    );
  });
  protected readonly closeLabel = computed(() => {
    const count = this.savedCount();
    return this.transloco.translate(
      pluralKey('popup.savedTabs.close', count, this.transloco.getActiveLang()),
      { count },
    );
  });

  protected reason(code: LinkBatchErrorCode): string {
    return this.transloco.translate(
      code === LINK_BATCH_ERROR_CODE.DuplicateInBatch
        ? 'popup.savedTabs.reason.duplicateInBatch'
        : 'popup.savedTabs.reason.urlTooLong',
    );
  }
}
