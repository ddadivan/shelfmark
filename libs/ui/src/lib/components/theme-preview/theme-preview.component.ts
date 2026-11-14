import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ThemePreviewCard } from './models/theme-preview-card.interface';

/**
 * A small, static sample of the app in the current tokens (Themes mockup, "Live preview"): a
 * sidebar with the first folder active and a few cards with a preview, the site, the title and a
 * tag. Every colour and radius is a token, so it follows the theme of its ancestors: the page,
 * or a wrapper with theme attributes (`data-theme`, `data-custom-*`). It follows the layout
 * attributes too (#285, `LAYOUT_ATTRIBUTE`): text size and font through the root font size and
 * `--font-sans`, density through the `--density-*` tokens, and the card options (preview image
 * large, small or off; site, notes and tags hidden with `off`). One image to assistive
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
  /** Link counts of the sidebar rows, by index; shown while `showCounts` is on. */
  readonly counts = input<readonly number[]>([]);
  readonly showCounts = input(true, { transform: booleanAttribute });
  /** A last sidebar row ("Recently opened"); none while empty. */
  readonly recentLabel = input('');
  readonly cards = input<readonly ThemePreviewCard[]>([]);
}
