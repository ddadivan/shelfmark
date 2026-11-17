import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ToolbarWidget } from '@angular/aria/toolbar';
import { FolderIconComponent } from '../folder-icon/folder-icon.component';
import { FOLDER_COLOUR } from '../folder-icon/models/folder-colour.const';
import type { FolderColour } from '../folder-icon/models/folder-colour.type';
import { FOLDER_ICON_SIZE } from '../folder-icon/models/folder-icon-size.const';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/models/icon-name.type';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import { SUGGESTION_KIND } from './models/suggestion-kind.const';
import type { SuggestionKind } from './models/suggestion-kind.type';

/**
 * A chip the model proposes (Suggestion spec): an existing tag, one new tag or an existing folder.
 * Dashed `ai-line` edge and no fill until the user takes it; then it turns solid `accent-bg` with a
 * check (200 ms `ease-spring`, no movement under reduced motion). The main button applies it, the
 * small x hides it for good. Put it inside `ui-suggestion-row`: both buttons are widgets of the
 * row's toolbar (one tab stop, arrow keys).
 *
 * Two modes. Normal: a click emits `accepted` (the feature applies it and removes the chip).
 * Review list (Tidy Unsorted): bind `selected` to a boolean; the chip starts solid when `true`, a
 * click emits `toggled` with the new value and nothing else changes until the page's Apply.
 *
 * Presentational: every string comes in as an input; `ariaLabel` says what happens ("Add tag
 * signals", "Create and add tag state management", "Move to Angular") and contains the label.
 */
@Component({
  selector: 'ui-suggestion',
  imports: [FolderIconComponent, IconComponent, ToolbarWidget],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-suggestion' },
  templateUrl: './suggestion.component.html',
  styleUrl: './suggestion.component.scss',
})
export class SuggestionComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly FOLDER_ICON_SIZE = FOLDER_ICON_SIZE;
  protected readonly SUGGESTION_KIND = SUGGESTION_KIND;

  /** The tag or folder name. */
  readonly label = input.required<string>();
  /** Name of the main button: what happens on a click. */
  readonly ariaLabel = input.required<string>();
  readonly kind = input<SuggestionKind>(SUGGESTION_KIND.Tag);
  /** Folder tile colour (a `FolderColour` or an own `#rrggbb`), for `kind` `folder`. */
  readonly folderColor = input<FolderColour | string>(FOLDER_COLOUR.Graphite);
  /** Folder tile glyph (an icon name or an emoji), for `kind` `folder`. */
  readonly folderIcon = input<IconName | string>('folder');
  /** The marker after a new tag's name ("New"). */
  readonly newLabel = input('New');
  /** Name of the x button ("Dismiss suggestion signals"); without it there is no x. */
  readonly dismissLabel = input('');
  /** Review list: `true` is solid (will be applied), `false` dashed; `null` is the normal mode. */
  readonly selected = input<boolean | null>(null);

  /** The chip was taken (normal mode). */
  readonly accepted = output<void>();
  /** The x was pressed: hide this suggestion for this link. */
  readonly dismissed = output<void>();
  /** Review list: the chip was toggled; the value is the new `selected`. */
  readonly toggled = output<boolean>();

  /** Taken in normal mode (the chip flashes solid until the feature removes it). */
  private readonly taken = signal(false);
  /** Set by the first click: the swell only plays after a user action, not when a list renders. */
  private readonly touched = signal(false);

  protected readonly isReview = computed(() => this.selected() !== null);
  protected readonly isAccepted = computed(() => this.selected() === true || this.taken());
  protected readonly isSwelling = computed(() => this.touched() && this.isAccepted());
  protected readonly showDismiss = computed(() => !!this.dismissLabel() && !this.isAccepted());

  protected apply(): void {
    this.touched.set(true);
    if (this.isReview()) {
      this.toggled.emit(!this.selected());
      return;
    }
    if (this.taken()) {
      return;
    }
    this.taken.set(true);
    this.accepted.emit();
  }
}
