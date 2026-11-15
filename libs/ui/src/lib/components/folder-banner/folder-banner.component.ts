import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { FolderColourDirective } from '../../directives/folder-colour/folder-colour.directive';

/**
 * The header surface of a folder page (#418): a soft band of the folder colour (none for
 * graphite, muted on a dark base), or a cover picture behind the content with a scrim from the
 * page background, so the text over it keeps its contrast. The picture is decorative; when it
 * fails the band shows instead. The heading, description and tools are projected.
 *
 * Colour through `FolderColourDirective` (`colour`: a `FolderColour` or an own `#rrggbb`).
 * Custom properties: `--ui-folder-banner-padding-block` and `-inline` (default `space-6`),
 * `--ui-folder-banner-cover-room`
 * (picture room above the content, default 88px; 64px on a phone), `--ui-folder-banner-ground`
 * (the scrim colour, default `--bg`).
 */
@Component({
  selector: 'ui-folder-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [{ directive: FolderColourDirective, inputs: ['uiFolderColour: colour'] }],
  host: {
    class: 'ui-folder-banner',
    '[class.ui-folder-banner--cover]': 'coverShown()',
  },
  template: `
    @if (coverShown()) {
      <img
        class="ui-folder-banner__cover"
        alt=""
        decoding="async"
        referrerpolicy="no-referrer"
        [src]="image()"
        (error)="failed.set(true)"
      />
      <span class="ui-folder-banner__scrim" aria-hidden="true"></span>
    }
    <div class="ui-folder-banner__content"><ng-content /></div>
  `,
  styleUrl: './folder-banner.component.scss',
})
export class FolderBannerComponent {
  /** A same-origin picture URL (a link preview), or `null` for the colour band only. */
  readonly image = input<string | null>(null);

  /** The picture failed to load; reset when another one is given. */
  protected readonly failed = linkedSignal({ source: this.image, computation: () => false });
  protected readonly coverShown = computed(() => !!this.image() && !this.failed());
}
