import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
} from '@angular/core';
import { ReducedMotion, SuggestionComponent, SuggestionRowComponent } from '@shelfmark/ui';
import { AI_CHIP_FLASH_MS } from './models/ai-chip-flash-ms.const';
import type { AiChipView } from './models/ai-chip-view.interface';

/**
 * One row of AI suggestion chips under a field of Add link / Edit link (`AiTags` mockup): the
 * folder row or the tags row. A taken chip flashes solid for `AI_CHIP_FLASH_MS` (at once under
 * reduced motion) before `accepted` fires; focus then moves to the chip that took its place, or
 * `cleared` asks the dialog to focus the field when the row is gone. The message of the change is
 * said by the row's live region, or by this component's own one once the row has collapsed.
 * Renders nothing without chips (and not loading): the place collapses.
 */
@Component({
  selector: 'app-ai-suggestion-row',
  imports: [SuggestionComponent, SuggestionRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ai-suggestion-row.component.html',
  styleUrl: './ai-suggestion-row.component.scss',
})
export class AiSuggestionRowComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly motion = inject(ReducedMotion);
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  readonly chips = input.required<readonly AiChipView[]>();
  /** Visible label: "Suggested", or "Also fits" when the user already chose. */
  readonly label = input.required<string>();
  /** Accessible name of the row: "Suggested tags", "Suggested folder". */
  readonly ariaLabel = input.required<string>();
  readonly loading = input(false);
  readonly loadingLabel = input('');
  /** "Add all" with two or more chips (the tags row). */
  readonly allowAddAll = input(false);
  readonly addAllLabel = input('');
  /** Said once every chip was added. */
  readonly addedAllMessage = input('');
  /** The marker after a new tag ("New"). */
  readonly newLabel = input('');

  readonly accepted = output<AiChipView>();
  readonly dismissed = output<AiChipView>();
  readonly acceptedAll = output<void>();
  /** The row has no chip left after an action: the dialog focuses the field. */
  readonly cleared = output<void>();

  private readonly announcement = signal('');
  protected readonly shown = computed(() => this.loading() || this.chips().length > 0);
  protected readonly rowAnnouncement = computed(() => (this.shown() ? this.announcement() : ''));
  protected readonly ownAnnouncement = computed(() => (this.shown() ? '' : this.announcement()));
  protected readonly addAll = computed(() => this.allowAddAll() && this.chips().length >= 2);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.timers.forEach((timer) => clearTimeout(timer)));
  }

  protected accept(chip: AiChipView, index: number): void {
    const apply = () => {
      this.announcement.set(chip.acceptedMessage);
      this.accepted.emit(chip);
      this.focusAfter(index);
    };
    if (this.motion.reduced()) {
      apply();
      return;
    }
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      apply();
    }, AI_CHIP_FLASH_MS);
    this.timers.add(timer);
  }

  protected dismiss(chip: AiChipView, index: number): void {
    this.dismissed.emit(chip);
    this.focusAfter(index);
  }

  protected acceptAll(): void {
    this.announcement.set(this.addedAllMessage());
    this.acceptedAll.emit();
    this.focusAfter(0);
  }

  /** After the dialog has applied the change: the chip now at `index` (or the last), else the field. */
  private focusAfter(index: number): void {
    afterNextRender(
      () => {
        const chips = this.host.nativeElement.querySelectorAll('ui-suggestion');
        const next = chips.item(Math.min(index, chips.length - 1));
        const button = next?.querySelector('button');
        if (button) {
          button.focus();
        } else {
          this.cleared.emit();
        }
      },
      { injector: this.injector },
    );
  }
}
