import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LINK_LIMIT } from '@shelfmark/contracts';
import {
  BADGE_TONE,
  BadgeComponent,
  BUTTON_VARIANT,
  ButtonComponent,
  CHIP_VARIANT,
  ChipComponent,
  FolderIconComponent,
  InputComponent,
  LogoComponent,
  TagInputComponent,
  type TagSuggestion,
} from '@shelfmark/ui';
import { PopupStore } from '../../popup.store';

/** State 1: the prefilled form; Save creates the link (Enter on the focused Save button). */
@Component({
  selector: 'ext-popup-form',
  templateUrl: './popup-form.component.html',
  styleUrl: './popup-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ext-screen',
    '(keydown.control.enter)': 'saveFromKeyboard($event)',
    '(keydown.meta.enter)': 'saveFromKeyboard($event)',
  },
  imports: [
    BadgeComponent,
    ButtonComponent,
    ChipComponent,
    FolderIconComponent,
    InputComponent,
    LogoComponent,
    TagInputComponent,
    TranslocoPipe,
  ],
})
export class PopupFormComponent {
  protected readonly store = inject(PopupStore);
  private readonly transloco = inject(TranslocoService);
  protected readonly BADGE_TONE = BADGE_TONE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly CHIP_VARIANT = CHIP_VARIANT;
  protected readonly LINK_LIMIT = LINK_LIMIT;
  private readonly saveButton = viewChild.required<ButtonComponent>('save');

  constructor() {
    // Everything is filled in already: the shortcut, then Enter, saves the page.
    afterNextRender(() => this.saveButton().focus());
  }

  protected readonly tagSuggestions = computed<TagSuggestion[]>(() =>
    this.store.tags().map((tag) => ({ name: tag.name })),
  );
  protected readonly folderName = computed(
    () =>
      this.store.newFolderName() ??
      this.store.folder()?.name ??
      this.transloco.translate('popup.unsorted'),
  );

  /** ⌘/Ctrl+Enter saves from anywhere in the form (Enter alone stays with the tag and note fields). */
  protected saveFromKeyboard(event: Event): void {
    event.preventDefault();
    void this.store.save();
  }
}
