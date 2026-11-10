import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { LinkResponse } from '@shelfmark/contracts';
import {
  ButtonComponent,
  FolderIconComponent,
  HistoryRowComponent,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  MenuTriggerDirective,
  TooltipDirective,
} from '@shelfmark/ui';
import { ownImageUrl, safeHref } from '../link-view';

/**
 * One opened link in "Recently opened": preview, title, the folder, the time of the open and a
 * "Remove from history" button. It only renders and emits; the page does the work.
 */
@Component({
  selector: 'app-link-history-row',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    FolderIconComponent,
    HistoryRowComponent,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    MenuTriggerDirective,
    TooltipDirective,
  ],
  templateUrl: './link-history-row.component.html',
  styleUrl: './link-history-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkHistoryRowComponent {
  readonly link = input.required<LinkResponse>();
  /** Name of the link's folder, or `null` for an unsorted link (the row says "Unsorted"). */
  readonly folderName = input<string | null>(null);
  /** Already formatted local time of the open. */
  readonly time = input.required<string>();
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
}
