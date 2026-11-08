import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { LinkResponse } from '@shelfmark/contracts';
import {
  ButtonComponent,
  CardComponent,
  ChipComponent,
  FaviconComponent,
  MenuComponent,
  MenuItemComponent,
  MenuTriggerDirective,
} from '@shelfmark/ui';
import { linkHost, safeHref, siteLetter } from '../link-view';

const MAX_TAGS = 3;

/**
 * One saved link in the cards view. It only renders and emits; the favorite and delete flows
 * live in `LinkActionsService`. The title opens the link in a new tab (http and https only).
 */
@Component({
  selector: 'app-link-card',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    CardComponent,
    ChipComponent,
    FaviconComponent,
    MenuComponent,
    MenuItemComponent,
    MenuTriggerDirective,
  ],
  templateUrl: './link-card.component.html',
  styleUrl: './link-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkCardComponent {
  readonly link = input.required<LinkResponse>();
  /** Plays the fade-in of cards that replace the skeleton. */
  readonly reveal = input(false);

  readonly opened = output<void>();
  readonly favoriteToggled = output<void>();
  readonly editRequested = output<void>();
  readonly deleteRequested = output<void>();

  protected readonly href = computed(() => safeHref(this.link().url));
  protected readonly host = computed(() => linkHost(this.link().url));
  protected readonly letter = computed(() => siteLetter(this.link().url));
  protected readonly tags = computed(() => this.link().tags.slice(0, MAX_TAGS));

  protected open(): void {
    if (this.href() !== undefined) {
      this.opened.emit();
    }
  }
}
