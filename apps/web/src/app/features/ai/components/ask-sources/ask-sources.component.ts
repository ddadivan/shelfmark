import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { AskSource } from '@shelfmark/contracts';
import type { AskCardGroup } from '../../models/ask-card-group.interface';
import { AskLinkCardsComponent } from '../ask-link-cards/ask-link-cards.component';

/**
 * "Sources from your shelf": the cited links not shown as cards, as the same link tiles as the
 * cards (`app-ask-link-cards`), numbered like the citations. `highlighted` marks the tile a
 * citation pointed to.
 */
@Component({
  selector: 'app-ask-sources',
  imports: [TranslocoPipe, AskLinkCardsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ask-sources.component.html',
  styleUrl: './ask-sources.component.scss',
})
export class AskSourcesComponent {
  readonly sources = input.required<readonly AskSource[]>();
  /** Prefix of the tile ids (`<prefix>-<n>`), so a citation can scroll to its tile. */
  readonly idPrefix = input.required<string>();
  /** The citation number whose tile is highlighted, or `null`. */
  readonly highlighted = input<number | null>(null);

  protected readonly group = computed((): AskCardGroup => ({
    items: this.sources(),
    total: null,
    search: null,
  }));
}
