import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { LinkResponse } from '@shelfmark/contracts';
import {
  ButtonComponent,
  ChipComponent,
  FaviconComponent,
  ListItemComponent,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  MenuTriggerDirective,
  TooltipDirective,
} from '@shelfmark/ui';
import { linkHost, ownImageUrl, safeHref, siteLetter } from '../link-view';

const MAX_TAGS = 2;

/** One saved link in the list view. It only renders and emits; see `LinkActionsService`. */
@Component({
  selector: 'app-link-row',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    ChipComponent,
    FaviconComponent,
    ListItemComponent,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    MenuTriggerDirective,
    TooltipDirective,
  ],
  templateUrl: './link-row.component.html',
  styleUrl: './link-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkRowComponent {
  readonly link = input.required<LinkResponse>();
  /** Plays the fade-in of rows that replace the skeleton. */
  readonly reveal = input(false);

  readonly opened = output<void>();
  /** "Open" from the actions menu: the link opens in a new tab. */
  readonly openRequested = output<void>();
  readonly favoriteToggled = output<void>();
  readonly editRequested = output<void>();
  readonly deleteRequested = output<void>();

  protected readonly href = computed(() => safeHref(this.link().url));
  protected readonly host = computed(() => linkHost(this.link().url));
  protected readonly letter = computed(() => siteLetter(this.link().url));
  protected readonly favicon = computed(() => ownImageUrl(this.link().faviconUrl));
  protected readonly tags = computed(() => this.link().tags.slice(0, MAX_TAGS));

  protected open(): void {
    if (this.href() !== undefined) {
      this.opened.emit();
    }
  }
}
