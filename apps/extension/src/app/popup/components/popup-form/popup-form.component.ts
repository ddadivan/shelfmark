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
  AiLineComponent,
  BADGE_TONE,
  BadgeComponent,
  BUTTON_VARIANT,
  ButtonComponent,
  CHIP_VARIANT,
  ChipComponent,
  FolderIconComponent,
  IconComponent,
  ICON_SIZE,
  InputComponent,
  LogoComponent,
  SUGGESTION_KIND,
  SuggestionComponent,
  SuggestionRowComponent,
  TagInputComponent,
  type TagSuggestion,
} from '@shelfmark/ui';
import { AI_LINE_KIND } from '../../models/ai-line-kind.const';
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
    AiLineComponent,
    BadgeComponent,
    ButtonComponent,
    ChipComponent,
    FolderIconComponent,
    IconComponent,
    InputComponent,
    LogoComponent,
    SuggestionComponent,
    SuggestionRowComponent,
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
  protected readonly AI_LINE_KIND = AI_LINE_KIND;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly SUGGESTION_KIND = SUGGESTION_KIND;
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

  protected readonly lineText = computed(() => {
    const line = this.store.ai.line();
    if (line?.kind !== AI_LINE_KIND.Limit) return this.transloco.translate('popup.ai.unavailable');
    return this.transloco.translate('popup.ai.limit', {
      date: this.resetDate(line.resetsOn ?? ''),
      limit: line.limit ?? 0,
    });
  });

  /** "1 December", in the popup's language, for the ISO date the monthly count resets. */
  private resetDate(iso: string): string {
    const date = new Date(`${iso}T00:00:00Z`);
    return Number.isNaN(date.getTime())
      ? ''
      : new Intl.DateTimeFormat(this.transloco.getActiveLang(), {
          day: 'numeric',
          month: 'long',
          timeZone: 'UTC',
        }).format(date);
  }

  /** ⌘/Ctrl+Enter saves from anywhere in the form (Enter alone stays with the tag and note fields). */
  protected saveFromKeyboard(event: Event): void {
    event.preventDefault();
    void this.store.save();
  }
}
