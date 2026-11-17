import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { FOLDER_LIMIT } from '@shelfmark/contracts';
import { BUTTON_VARIANT, ButtonComponent, InputComponent } from '@shelfmark/ui';
import { PopupStore } from '../../popup.store';

/** A new folder for this link: named here, created when the page is saved. */
@Component({
  selector: 'ext-popup-new-folder',
  templateUrl: './popup-new-folder.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ext-screen',
    '(keydown.escape)': 'store.openPicker()',
    '(keydown.enter)': 'create($event)',
  },
  imports: [ButtonComponent, InputComponent, TranslocoPipe],
})
export class PopupNewFolderComponent {
  protected readonly store = inject(PopupStore);
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly name = signal(this.store.newFolderName() ?? '');
  protected readonly empty = computed(() => this.name().trim() === '');
  private readonly input = viewChild.required(InputComponent);

  constructor() {
    afterNextRender(() => this.input().focus());
  }

  protected create(event?: Event): void {
    event?.preventDefault();
    if (this.empty()) return;
    this.store.chooseNewFolder(this.name().slice(0, FOLDER_LIMIT.NameMax));
  }
}
