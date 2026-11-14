import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RippleDirective } from '../../directives/ripple/ripple.directive';
import { KEYBOARD_KEY } from '../../models/keyboard';
import {
  lastInputWasPointer,
  returnFocus,
  trackInputModality,
} from '../../services/dialog/focus-return';
import { FieldPopup } from '../../services/overlay/field-popup';
import { nextFieldId } from '../field/field-ids';
import { FolderIconComponent } from '../folder-icon/folder-icon.component';
import { FOLDER_COLOUR } from '../folder-icon/models/folder-colour.const';
import type { FolderColour } from '../folder-icon/models/folder-colour.type';
import { FOLDER_ICON_SIZE } from '../folder-icon/models/folder-icon-size.const';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/models/icon-name.type';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import type { PickerOption } from '../picker-list/models/picker-option.interface';
import { PickerListComponent } from '../picker-list/picker-list.component';

/**
 * A title-sized button that opens the folder picker in a popover: the header of each half of the
 * side-by-side view. The trigger shows a folder tile, the (truncated) name and a chevron; the
 * popover is a glass `role="dialog"` in a `UiOverlay` pane under the trigger's start edge that
 * hosts `ui-picker-list` (search box focused on open, arrows, Enter, typing as there). Choosing a
 * row closes it and emits `chosen` (not for the value already shown). Esc and a press or focus
 * outside close it; Esc and a choice hand focus back to the trigger. Every string comes in
 * through an input.
 */
@Component({
  selector: 'ui-picker-menu',
  imports: [FolderIconComponent, IconComponent, PickerListComponent, RippleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-picker-menu' },
  templateUrl: './picker-menu.component.html',
  styleUrl: './picker-menu.component.scss',
})
export class PickerMenuComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly FOLDER_ICON_SIZE = FOLDER_ICON_SIZE;

  /** The option tree of the list. */
  readonly options = input<readonly PickerOption[]>([]);
  /** The shown id (`null` = the empty row). It carries the check in the list. */
  readonly value = input<string | null>(null);
  /** Visible name of the value. */
  readonly label = input.required<string>();
  /** Glyph of the tile before the name (default `folder`). */
  readonly icon = input<IconName | string>('folder');
  /** Colour of the tile; graphite when unset. */
  readonly colour = input<FolderColour | string>(FOLDER_COLOUR.Graphite);
  /** Text of the `null` row, for example "Unsorted". */
  readonly emptyLabel = input('');
  /** Ids of rows that cannot be chosen (the other half's folder). */
  readonly currentIds = input<readonly (string | null)[]>([]);
  /** Text of those rows' mark, for example "On the left". */
  readonly currentLabel = input('');
  /** Accessible name and placeholder of the search box. */
  readonly searchLabel = input.required<string>();
  /** Accessible name of the popover and its list. */
  readonly listLabel = input.required<string>();
  /** Text shown when the search finds nothing. */
  readonly noResultsLabel = input('');
  /** Accessible name of the button ("Left feed: Angular. Change"); the visible name when empty. */
  readonly triggerLabel = input('');

  /** A different row was chosen: its id, or `null` for the empty row. */
  readonly chosen = output<string | null>();

  protected readonly open = signal(false);
  protected readonly panelId = nextFieldId();

  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly popupEl = viewChild.required<ElementRef<HTMLElement>>('popupRef');
  protected readonly popup = new FieldPopup({
    origin: () => this.trigger().nativeElement,
    popup: () => this.popupEl().nativeElement,
    isShown: () => this.open(),
    onDetached: () => this.open.set(false),
  });
  private openedByPointer = false;
  private readonly outsidePress = (event: Event): void => {
    if (event.target instanceof Node && !this.owns(event.target)) {
      this.close(false);
    }
  };

  constructor() {
    trackInputModality();
    inject(DestroyRef).onDestroy(() =>
      this.document.removeEventListener('pointerdown', this.outsidePress, true),
    );
  }

  protected toggle(): void {
    if (this.open()) {
      this.close(true);
      return;
    }
    this.openedByPointer = lastInputWasPointer();
    this.popup.show();
    this.open.set(true);
    this.document.addEventListener('pointerdown', this.outsidePress, true);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === KEYBOARD_KEY.Escape) {
      // Stopped, so a dialog around the menu keeps its own Esc.
      event.preventDefault();
      event.stopPropagation();
      this.close(true);
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && !this.owns(next)) {
      this.close(false);
    }
  }

  protected onChosen(id: string | null): void {
    this.close(true);
    if (id !== this.value()) {
      this.chosen.emit(id);
    }
  }

  private close(restoreFocus: boolean): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    this.document.removeEventListener('pointerdown', this.outsidePress, true);
    if (restoreFocus) {
      returnFocus(this.trigger().nativeElement, this.openedByPointer);
    }
    this.popup.hide();
  }

  private owns(node: Node): boolean {
    return this.host.nativeElement.contains(node) || this.popupEl().nativeElement.contains(node);
  }
}
