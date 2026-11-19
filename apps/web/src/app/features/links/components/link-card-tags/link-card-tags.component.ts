import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  input,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  ChipComponent,
  PopoverComponent,
  PopoverTriggerDirective,
  TooltipDirective,
} from '@shelfmark/ui';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { TagActionsService } from '../../../tags/services/tag-actions.service';

/**
 * The tags of a card footer (#512, hotfix 2.2.1): the first tag as a chip that ends in an
 * ellipsis inside its maximum width (its full name in a tooltip once it is cut), then a "+N" chip
 * for the rest. "+N" opens the "All tags" popover (hover, keyboard focus, click or tap) with
 * every tag as a chip. A tag chip lists the links with that tag, unless the card is
 * `interactive="false"` (read-only or selecting): then the chips are plain text.
 */
@Component({
  selector: 'app-link-card-tags',
  imports: [
    TranslocoPipe,
    ChipComponent,
    PopoverComponent,
    PopoverTriggerDirective,
    TooltipDirective,
  ],
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
  /** A tag chip lists the links with that tag. */
  readonly interactive = input(true, { transform: booleanAttribute });

  private readonly injector = inject(Injector);

  protected readonly first = computed(() => this.tags().at(0));
  /** "+N" and its accessible name: the tags after the first. */
  protected readonly more = computed(() => {
    const rest = this.tags().slice(1);
    return { count: rest.length, list: rest.join(', ') };
  });
  protected readonly moreLabelKey = computed(() =>
    pluralKey('links.card.moreTagsLabel', this.more().count),
  );
  /** The first chip ends in an ellipsis: its tooltip shows the whole name. */
  protected readonly firstClipped = signal(false);

  /** Checked when the pointer or focus reaches the chip, so the tooltip only shows when useful. */
  protected checkClipped(chip: ChipComponent): void {
    this.firstClipped.set(chip.isTruncated());
  }

  protected select(tag: string, popover?: PopoverComponent): void {
    popover?.close({ restoreFocus: false });
    void this.injector.get(TagActionsService).showLinks(tag);
  }
}
