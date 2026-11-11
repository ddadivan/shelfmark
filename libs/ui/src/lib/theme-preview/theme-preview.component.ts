import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ThemePreviewCard } from './models/theme-preview-card.interface';

/**
 * A small, static sample of the app in the current tokens (Themes mockup, "Live preview"): a
 * sidebar with the first folder active and a few cards with a preview, the site, the title and a
 * tag. Every colour and radius is a token, so it follows the theme of its ancestors: the page,
 * or a wrapper with theme attributes (`data-theme`, `data-custom-*`). One image to assistive
 * technology, named by `ariaLabel`.
 */
@Component({
  selector: 'ui-theme-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-theme-preview',
    role: 'img',
    '[attr.aria-label]': 'ariaLabel()',
  },
  templateUrl: './theme-preview.component.html',
  styleUrl: './theme-preview.component.scss',
})
export class ThemePreviewComponent {
  readonly ariaLabel = input.required<string>();
  /** Sidebar rows; the first is drawn as the active folder. */
  readonly folders = input<readonly string[]>([]);
  readonly cards = input<readonly ThemePreviewCard[]>([]);
}
