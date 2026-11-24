import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  input,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  CHIP_VARIANT,
  ChipComponent,
  PopoverComponent,
  PopoverTriggerDirective,
} from '@shelfmark/ui';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { TagActionsService } from '../../../tags/services/tag-actions.service';
import { CARD_TAGS_SHOWN } from './models/card-tags-shown.const';

/**
 * The hashtags of a card (Shelf LinkCard): the first three tags as plain `#tag` text, then "+N"
 * for the rest, which opens a popover (hover, keyboard focus, click or tap) with those other
 * tags; no tag appears twice. A tag lists the links with that tag, unless the card is
 * `interactive="false"` (read-only or selecting): then the tags are plain text.
 */
@Component({
  selector: 'app-link-card-tags',
  imports: [TranslocoPipe, ChipComponent, PopoverComponent, PopoverTriggerDirective],
  templateUrl: './link-card-tags.component.html',
  styleUrl: './link-card-tags.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'link-card-tags',
    '[class.link-card-tags--interactive]': 'interactive()',
  },
})
export class LinkCardTagsComponent {
  /** Every tag of the link, in its order. */
  readonly tags = input.required<readonly string[]>();
  /** A tag lists the links with that tag. */
  readonly interactive = input(true, { transform: booleanAttribute });

  private readonly injector = inject(Injector);
  protected readonly CHIP_VARIANT = CHIP_VARIANT;

  /** The tags on the card. */
  protected readonly shown = computed(() => this.tags().slice(0, CARD_TAGS_SHOWN));
  /** The tags in the popover: the ones not shown on the card. */
  protected readonly hidden = computed(() => this.tags().slice(CARD_TAGS_SHOWN));
  /** "+N" and its accessible name. */
  protected readonly more = computed(() => {
    const rest = this.hidden();
    return { count: rest.length, list: rest.join(', ') };
  });
  protected readonly moreLabelKey = computed(() =>
    pluralKey('links.card.moreTagsLabel', this.more().count),
  );

  protected select(tag: string, popover?: PopoverComponent): void {
    popover?.close({ restoreFocus: false });
    void this.injector.get(TagActionsService).showLinks(tag);
  }
}
