import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { BUTTON_VARIANT, ButtonComponent, NOTICE_KIND, NoticeComponent } from '@shelfmark/ui';
import { PopupStore } from '../../popup.store';
import { relativeDay } from '../../utils/relative-day';
import { PopupLinkCardComponent } from '../popup-link-card/popup-link-card.component';

/** State 5: the URL is saved already; nothing is created unless the user asks for a copy. */
@Component({
  selector: 'ext-popup-duplicate',
  templateUrl: './popup-duplicate.component.html',
  styleUrl: './popup-duplicate.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ext-screen' },
  imports: [ButtonComponent, NoticeComponent, PopupLinkCardComponent, TranslocoPipe],
})
export class PopupDuplicateComponent {
  protected readonly store = inject(PopupStore);
  private readonly transloco = inject(TranslocoService);
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;

  protected readonly when = computed(() => {
    const link = this.store.link();
    return link === null ? '' : relativeDay(link.createdAt, this.transloco.getActiveLang());
  });
  protected readonly folderName = computed(
    () => this.store.linkFolder()?.name ?? this.transloco.translate('popup.unsorted'),
  );
}
