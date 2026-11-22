import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  BUTTON_VARIANT,
  ButtonComponent,
  IconComponent,
  ICON_SIZE,
  PickerListComponent,
} from '@shelfmark/ui';
import { PopupStore } from '../../popup.store';
import { pluralKey } from '../../utils/plural-key';

/**
 * State 4: the Move to folder list filling the popup; choosing a row goes back to the form. In All
 * tabs after "Sort with AI" it has a first row "Keep AI picks" (each link its own folder, ticked while
 * active); opened from a row's folder chip it picks the folder of that one link.
 */
@Component({
  selector: 'ext-popup-picker',
  templateUrl: './popup-picker.component.html',
  styleUrl: './popup-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ext-screen', '(keydown.escape)': 'store.closePicker()' },
  imports: [ButtonComponent, IconComponent, PickerListComponent, TranslocoPipe],
})
export class PopupPickerComponent {
  protected readonly store = inject(PopupStore);
  private readonly transloco = inject(TranslocoService);
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly ICON_SIZE = ICON_SIZE;

  /** Opened for one link of the list. */
  protected readonly forOneLink = computed(() => this.store.pickerTarget() !== null);
  /** The "Keep AI picks" row: only for the Folder field, once some link was sorted. */
  protected readonly keepRowShown = computed(
    () => !this.forOneLink() && this.store.tabsAi.sorted(),
  );
  /** The ticked row: that link's folder, the Folder field's, or none while "Keep AI picks" is on. */
  protected readonly value = computed(() => {
    const key = this.store.pickerTarget();
    if (key !== null) return this.store.tabsAi.shownFolder(key);
    return this.store.tabsAi.picksActive() ? undefined : this.store.folderId();
  });
  protected readonly title = computed(() => {
    if (!this.store.tabList.active()) return this.transloco.translate('popup.picker.title');
    if (this.forOneLink()) return this.transloco.translate('popup.picker.titleOne');
    const count = this.store.tabList.selectedCount();
    return this.transloco.translate(
      pluralKey('popup.picker.titleAll', count, this.transloco.getActiveLang()),
      { count },
    );
  });
}
