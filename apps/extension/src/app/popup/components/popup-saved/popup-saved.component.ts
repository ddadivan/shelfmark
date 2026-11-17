import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  BUTTON_VARIANT,
  ButtonComponent,
  IconComponent,
  NOTICE_KIND,
  NoticeComponent,
} from '@shelfmark/ui';
import { PopupStore } from '../../popup.store';
import { PopupLinkCardComponent } from '../popup-link-card/popup-link-card.component';

/** State 2: the thank-you screen with the new card; the check pops in once. */
@Component({
  selector: 'ext-popup-saved',
  templateUrl: './popup-saved.component.html',
  styleUrl: './popup-saved.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ext-screen', '(keydown.escape)': 'store.close()' },
  imports: [ButtonComponent, IconComponent, NoticeComponent, PopupLinkCardComponent, TranslocoPipe],
})
export class PopupSavedComponent {
  protected readonly store = inject(PopupStore);
  private readonly transloco = inject(TranslocoService);
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly folderName = computed(
    () => this.store.linkFolder()?.name ?? this.transloco.translate('popup.unsorted'),
  );
}
