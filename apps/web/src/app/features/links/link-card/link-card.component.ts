import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { LinkResponse } from '@shelfmark/contracts';
import {
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  ChipComponent,
  FaviconComponent,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  MenuTriggerDirective,
  PointerShadowDirective,
  TooltipDirective,
} from '@shelfmark/ui';
import { linkAddress, linkHost, ownImageUrl, safeHref, siteLetter } from '../link-view';

const MAX_TAGS = 3;

/**
 * One saved link in the cards view. It only renders and emits; the favorite and delete flows
 * live in `LinkActionsService`. The title opens the link in a new tab (http and https only).
 */
@Component({
  selector: 'app-link-card',
  imports: [
    TranslocoPipe,
    BadgeComponent,
    ButtonComponent,
    CardComponent,
    ChipComponent,
    FaviconComponent,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    MenuTriggerDirective,
    PointerShadowDirective,
    TooltipDirective,
  ],
  templateUrl: './link-card.component.html',
  styleUrl: './link-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkCardComponent {
  readonly link = input.required<LinkResponse>();
  /** Plays the fade-in of cards that replace the skeleton. */
  readonly reveal = input(false);

  /** The link is shown inside a folder: its menu offers "Pin to top" (a pinned link leads the folder). */
  readonly pinnable = input(false);
  /** The link is pinned to the sidebar. */
  readonly pinnedToSidebar = input(false);

  readonly pinToTopToggled = output<void>();
  readonly pinToSidebarToggled = output<void>();

  /** Pinned to the top of the folder that is open. */
  protected readonly pinnedToTop = computed(
    () => this.pinnable() && this.link().pinnedInFolderAt !== null,
  );

  readonly opened = output<void>();
  /** "Open" from the actions menu: the link opens in a new tab. */
  readonly openRequested = output<void>();
  readonly favoriteToggled = output<void>();
  readonly editRequested = output<void>();
  readonly deleteRequested = output<void>();

  protected readonly href = computed(() => safeHref(this.link().url));
  protected readonly host = computed(() => linkHost(this.link().url));
  protected readonly address = computed(() => linkAddress(this.link().url));
  protected readonly letter = computed(() => siteLetter(this.link().url));
  protected readonly favicon = computed(() => ownImageUrl(this.link().faviconUrl));
  protected readonly image = computed(() => ownImageUrl(this.link().imageUrl));
  protected readonly tags = computed(() => this.link().tags.slice(0, MAX_TAGS));
  protected readonly hiddenTags = computed(() => Math.max(0, this.link().tags.length - MAX_TAGS));

  protected open(): void {
    if (this.href() !== undefined) {
      this.opened.emit();
    }
  }
}
