import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BUTTON_VARIANT, ButtonComponent, PickerListComponent } from '@shelfmark/ui';
import { PopupStore } from '../../popup.store';

/** State 4: the Move to folder list filling the popup; choosing a row goes back to the form. */
@Component({
  selector: 'ext-popup-picker',
  templateUrl: './popup-picker.component.html',
  styleUrl: './popup-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ext-screen', '(keydown.escape)': 'store.closePicker()' },
  imports: [ButtonComponent, PickerListComponent, TranslocoPipe],
})
export class PopupPickerComponent {
  protected readonly store = inject(PopupStore);
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
}
