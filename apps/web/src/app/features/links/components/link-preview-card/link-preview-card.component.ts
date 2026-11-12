import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CardComponent, ChipComponent, FaviconComponent } from '@shelfmark/ui';
import { LocaleService } from '../../../../core/i18n/locale.service';

const DAY_MS = 86_400_000;

/**
 * A saved link drawn exactly like a library card (`ui-card`: the drawing on the rotating soft
 * background, favicon and domain with the relative date on the right, the title, tag chips), for
 * the places that only show what the app looks like: the landing's app preview and the sign-in
 * cards. It is a picture, not a link: put it inside an `inert` / `aria-hidden` container, the
 * card's own title button would otherwise be a tab stop.
 */
@Component({
  selector: 'app-link-preview-card',
  imports: [CardComponent, ChipComponent, FaviconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './link-preview-card.component.html',
  styleUrl: './link-preview-card.component.scss',
})
export class LinkPreviewCardComponent {
  private readonly locale = inject(LocaleService);
  private readonly now = Date.now();

  readonly title = input.required<string>();
  /** The domain shown next to the favicon. */
  readonly host = input.required<string>();
  /** How many days ago the link was saved: "2 days ago", "Last week", then a date. */
  readonly daysAgo = input(0);
  /** Already translated tag names. */
  readonly tags = input<readonly string[]>([]);
  /** Which of the three soft preview backgrounds (0 to 2) the drawing sits on. */
  readonly tone = input(0);

  protected readonly letter = computed(() => this.host().charAt(0).toUpperCase());
  protected readonly saved = computed(() =>
    this.locale.formatSaved(new Date(this.now - this.daysAgo() * DAY_MS).toISOString(), this.now),
  );
}
