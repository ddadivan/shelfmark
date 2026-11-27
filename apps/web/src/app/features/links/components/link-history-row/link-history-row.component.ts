import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  FOLDER_DEFAULT_COLOUR,
  FOLDER_DEFAULT_ICON,
  type FolderColour,
  type FolderIcon,
  type LinkResponse,
} from '@shelfmark/contracts';
import {
  BUTTON_VARIANT,
  ButtonComponent,
  FolderChipComponent,
  HistoryRowComponent,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  MenuTriggerDirective,
  TooltipDirective,
} from '@shelfmark/ui';
import { SwipeRevealDirective } from '../../../../core/layout/directives/swipe-reveal.directive';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { linkHost, ownImageUrl, safeHref } from '../../utils/link-view';

/**
 * One opened link in "Recently opened": preview, title, the folder, the time of the open and a
 * menu (Open in new tab, Show in folder, Copy link, Remove from history). It only renders and
 * emits; the page does the work.
 *
 * Phone: swiping the row left reveals "Remove" (the Trash pattern, `appSwipeReveal`). The button is
 * always in the DOM behind the row, so keyboard and screen reader users never need the swipe
 * (focusing it slides the row aside), and the menu stays on the row as well.
 */
import { UserSettingsStore } from '../../../../stores/user-settings.store';

@Component({
  selector: 'app-link-history-row',
  imports: [
    NgTemplateOutlet,
    TranslocoPipe,
    ButtonComponent,
    FolderChipComponent,
    HistoryRowComponent,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    MenuTriggerDirective,
    SwipeRevealDirective,
    TooltipDirective,
  ],
  templateUrl: './link-history-row.component.html',
  styleUrl: './link-history-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.link-history-row--phone]': 'viewport.compact()' },
})
export class LinkHistoryRowComponent {
  /** Settings › Library › Open links in: a new tab (default) or the same tab. */
  protected readonly newTab = inject(UserSettingsStore).openInNewTab;
  protected readonly viewport = inject(ViewportService);
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;

  readonly link = input.required<LinkResponse>();
  /** Name of the link's folder, or `null` for an unsorted link (the row says "Unsorted"). */
  readonly folderName = input<string | null>(null);
  /** Colour and icon of the folder tile (graphite and the folder glyph by default). */
  readonly folderColour = input<FolderColour | string>(FOLDER_DEFAULT_COLOUR);
  readonly folderIcon = input<FolderIcon | string>(FOLDER_DEFAULT_ICON);
  /** Already formatted local time of the open. */
  readonly time = input.required<string>();
  /**
   * Shelf flat row (15-tools "Recently opened" page): the site under the title in place of the
   * folder chip, and a remove (x) button next to the menu.
   */
  readonly flat = input(false, { transform: booleanAttribute });
  /** Machine-readable time for the `<time>` element. */
  readonly dateTime = input.required<string>();

  /** The row was opened (the browser opens the link itself). */
  readonly opened = output<void>();
  /** Menu: open the link in a new tab (only for a link the browser may open). */
  readonly openInNewTab = output<void>();
  /** Menu: go to the folder of the link, or to Unsorted. */
  readonly showInFolder = output<void>();
  readonly copyLink = output<void>();
  readonly removeRequested = output<void>();

  protected readonly href = computed(() => safeHref(this.link().url));
  protected readonly preview = computed(() => ownImageUrl(this.link().imageUrl));
  protected readonly host = computed(() => linkHost(this.link().url));

  /** Swipe state of the phone row ("Remove" waits behind it); absent on desktop. */
  private readonly swipeReveal = viewChild(SwipeRevealDirective);

  /**
   * A tap opens the link (the browser follows the `href`), except the click that ends a swipe and
   * a tap on a swiped-open row, which closes it.
   */
  protected onActivated(event: MouseEvent): void {
    const swipe = this.swipeReveal();
    if (swipe?.takeClick()) {
      event.preventDefault();
      return;
    }
    if (swipe?.open()) {
      event.preventDefault();
      swipe.setOpen(false);
      return;
    }
    this.opened.emit();
  }

  protected removeFromSwipe(): void {
    this.swipeReveal()?.setOpen(false);
    this.removeRequested.emit();
  }
}
