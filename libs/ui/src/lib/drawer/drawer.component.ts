import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { BUTTON_SIZE } from '../button/models/button-size.const';
import { UiDialogRef } from '../dialog/dialog-ref';

/**
 * Layout of a side drawer: a header (`slot="head"`, for example the logo) with a close button,
 * a scrolling body (default slot) and a footer (`slot="foot"`). Pinned to the inline-start
 * edge, full viewport height, `min(19.5rem, 100vw - 3rem)` wide, with safe-area padding.
 * Opened through `DrawerService`, whose content component renders it; it also works on its own
 * for docs. It slides in from the inline-start edge and out again (a fade under
 * `prefers-reduced-motion`).
 */
@Component({
  selector: 'ui-drawer',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-drawer-host' },
  templateUrl: './drawer.component.html',
  styleUrl: './drawer.component.scss',
})
export class DrawerComponent {
  /** Accessible name of the close button, for example "Close menu". */
  readonly closeLabel = input.required<string>();

  /** The close button was used. The drawer also closes itself when opened by `DrawerService`. */
  readonly closeRequested = output<void>();

  private readonly ref = inject<UiDialogRef<unknown>>(UiDialogRef, { optional: true });

  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly leaving = computed(() => this.ref?.leaving() ?? false);

  protected requestClose(): void {
    this.closeRequested.emit();
    this.ref?.close();
  }
}
