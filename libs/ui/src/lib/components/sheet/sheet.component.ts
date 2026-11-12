import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DialogComponent } from '../dialog/dialog.component';
import { SHEET_HEIGHT } from './models/sheet-height.const';
import type { SheetHeight } from './models/sheet-height.type';

/**
 * Content of a bottom sheet: Recently opened, Remind me, move to folder. Open it with
 * `DialogService.open(Component)`; the component renders `<ui-sheet title="…" closeLabel="…">`.
 *
 * It is a `ui-dialog` with sheet styling, so everything behind it is the dialog's: below 40em it
 * slides up from the bottom with a grip (28px top corners, `ease-drawer`) and closes by dragging
 * or flicking down, Esc, the scrim and the close button (all through `UiDialogRef`, which plays
 * the leave animation); on larger screens the same content is a centred dialog (`size` of the
 * open options). Focus is trapped and restored by the CDK. Reduced motion fades instead.
 *
 * `height` is `auto` (as tall as the content) or `tall` (fills the screen); either way at least
 * 150px of the page stay visible above. Slots: `slot="actions"` (header buttons, left of the
 * close button) and the default body, which scrolls when it is too long.
 */
@Component({
  selector: 'ui-sheet',
  imports: [DialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `title` is an input: keep the browser from showing it as a native tooltip.
  host: { '[attr.title]': 'null' },
  templateUrl: './sheet.component.html',
  styles: ':host { display: block; }',
})
export class SheetComponent {
  /** Heading of the sheet; it names it for assistive technology. */
  readonly title = input.required<string>();
  /** `auto` (default) or `tall`. */
  readonly height = input<SheetHeight>(SHEET_HEIGHT.Auto);
  /** Accessible name of the close button. Without it there is no close button. */
  readonly closeLabel = input<string>();
}
