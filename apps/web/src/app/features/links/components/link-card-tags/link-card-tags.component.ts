import {
  afterNextRender,
  type AfterViewInit,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ChipComponent, PopoverComponent, PopoverTriggerDirective } from '@shelfmark/ui';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { TagActionsService } from '../../../tags/services/tag-actions.service';
import { MEASURE_FALLBACK_MS } from './models/measure-fallback-ms.const';

/**
 * The tags of a card footer (#512, hotfix 2.2.1): the first tag as a chip, then a "+N" chip for
 * the rest, which opens a popover (hover, keyboard focus, click or tap) with those other tags.
 * The first tag is shown only while it fits whole: when it would end in an ellipsis the card
 * shows "+N" for every tag and the popover lists them all ("All tags"), so no tag is ever cut
 * on the card and none appears twice. Measured against the footer's width, again on resize. A tag chip lists the links with that tag, unless the card is
 * `interactive="false"` (read-only or selecting): then the chips are plain text.
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
    '[class.link-card-tags--measuring]': '!measured()',
  },
})
export class LinkCardTagsComponent implements AfterViewInit {
  /** Every tag of the link, in its order. */
  readonly tags = input.required<readonly string[]>();
  /** A tag chip lists the links with that tag. */
  readonly interactive = input(true, { transform: booleanAttribute });

  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly firstChip = viewChild<ChipComponent>('firstChip');
  private readonly firstChipElement = viewChild('firstChip', { read: ElementRef<HTMLElement> });

  /** The first tag does not fit whole: the card shows only "+N" for every tag. */
  protected readonly collapsed = signal(false);
  /** Hidden until the first measure, so a tag that does not fit never flashes cut. */
  protected readonly measured = signal(false);

  protected readonly first = computed(() => (this.collapsed() ? undefined : this.tags().at(0)));
  /** The tags in the popover: the ones not shown on the card. */
  protected readonly hidden = computed(() =>
    this.collapsed() ? this.tags() : this.tags().slice(1),
  );
  /** "+N" and its accessible name. */
  protected readonly more = computed(() => {
    const rest = this.hidden();
    return { count: rest.length, list: rest.join(', ') };
  });
  protected readonly moreLabelKey = computed(() =>
    pluralKey('links.card.moreTagsLabel', this.more().count),
  );

  /**
   * Watches the footer (its width does not depend on the tags) and measures on each change; also
   * watches the first tag itself, so a tag that grows later (the web font arrived after the first
   * measure) and gets cut moves into "+N".
   */
  ngAfterViewInit(): void {
    const footer = this.host.nativeElement.parentElement;
    if (!footer || typeof ResizeObserver === 'undefined') {
      this.measured.set(true);
      return;
    }
    let width = -1;
    const observer = new ResizeObserver(() => {
      if (footer.clientWidth !== width) {
        width = footer.clientWidth;
        this.measure();
      } else if (!this.collapsed()) {
        this.check();
      }
    });
    observer.observe(footer);
    effect(
      (onCleanup) => {
        const chip = this.firstChipElement()?.nativeElement;
        if (!chip) return;
        observer.observe(chip);
        onCleanup(() => observer.unobserve(chip));
      },
      { injector: this.injector },
    );
    // A web font that arrives later widens the tag: check again after each font load.
    const fonts = document.fonts as FontFaceSet | undefined;
    const onFonts = (): void => {
      if (!this.collapsed()) this.check();
    };
    void fonts?.ready.then(onFonts);
    fonts?.addEventListener('loadingdone', onFonts);
    // A browser that delivers no resize callback (a background tab) must not leave the tags
    // hidden: measure once anyway.
    const fallback = setTimeout(() => {
      if (!this.measured()) this.measure();
    }, MEASURE_FALLBACK_MS);
    this.destroyRef.onDestroy(() => {
      observer.disconnect();
      fonts?.removeEventListener('loadingdone', onFonts);
      clearTimeout(fallback);
    });
  }

  /** Shows the first tag, then keeps it only if it is not cut. */
  private measure(): void {
    if (!this.collapsed()) {
      // The first tag is on screen already: measure it now (no render would come to wait for).
      this.check();
      return;
    }
    this.collapsed.set(false);
    afterNextRender(() => this.check(), { injector: this.injector });
  }

  /** Collapses into "+N" when the first tag on screen is cut. */
  private check(): void {
    this.collapsed.set(this.firstChip()?.isTruncated() ?? false);
    this.measured.set(true);
  }

  protected select(tag: string, popover?: PopoverComponent): void {
    popover?.close({ restoreFocus: false });
    void this.injector.get(TagActionsService).showLinks(tag);
  }
}
