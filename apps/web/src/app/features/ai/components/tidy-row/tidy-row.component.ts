import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  ButtonComponent,
  FaviconComponent,
  SuggestionComponent,
  SuggestionRowComponent,
} from '@shelfmark/ui';
import { linkHost, ownImageUrl, siteLetter } from '../../../links/utils/link-view';
import type { TidyChipToggle } from '../../models/tidy-chip-toggle.interface';
import type { TidyRowView } from '../../models/tidy-row-view.interface';

/**
 * One link of Tidy Unsorted (`AiTidy` 2, `MobileAi` 6): title, favicon and host, its suggestion
 * chips in review mode (a toolbar named "Changes for {title}") and Skip. A skipped link says it
 * stays in Unsorted and offers "Undo skip"; focus follows to the button that took the place of
 * the pressed one. A row on desktop, a card in the mobile shell (CSS only).
 */
@Component({
  selector: 'app-tidy-row',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    FaviconComponent,
    SuggestionComponent,
    SuggestionRowComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tidy-row.component.html',
  styleUrl: './tidy-row.component.scss',
})
export class TidyRowComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly row = input.required<TidyRowView>();

  readonly toggled = output<TidyChipToggle>();
  readonly dismissed = output<string>();
  readonly skipped = output<void>();
  readonly unskipped = output<void>();

  private readonly skipButton = viewChild<ButtonComponent>('skipButton');
  private readonly undoButton = viewChild<ButtonComponent>('undoButton');

  protected readonly hostName = computed(() => linkHost(this.row().link.url));
  protected readonly letter = computed(() => siteLetter(this.row().link.url));
  protected readonly favicon = computed(() => ownImageUrl(this.row().link.faviconUrl));

  protected skip(): void {
    this.skipped.emit();
    afterNextRender(() => this.undoButton()?.focus(), { injector: this.injector });
  }

  protected undoSkip(): void {
    this.unskipped.emit();
    afterNextRender(() => this.skipButton()?.focus(), { injector: this.injector });
  }

  /** The x of a chip: the chip that takes its place gets focus, else Skip. */
  protected dismiss(id: string, index: number): void {
    this.dismissed.emit(id);
    afterNextRender(
      () => {
        const chips = this.host.nativeElement.querySelectorAll('ui-suggestion');
        const next = chips.item(Math.min(index, chips.length - 1))?.querySelector('button');
        if (next) {
          next.focus();
        } else {
          this.skipButton()?.focus();
        }
      },
      { injector: this.injector },
    );
  }
}
