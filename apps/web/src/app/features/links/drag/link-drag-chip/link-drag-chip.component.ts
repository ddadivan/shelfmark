import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FaviconComponent } from '@shelfmark/ui';
import type { LinkResponse } from '@shelfmark/contracts';
import { ownImageUrl, siteLetter } from '../../link-view';

/**
 * The drag preview of a link (DragDrop spec): a small glass chip with the site icon, the title
 * truncated and, when a selection travels together, its count ("3 links"). It is small and sits
 * down-right of the pointer, so the folders under the pointer stay visible. The text is given
 * ready (`label`, `count`): the page translates it. The CDK clones it into `<body>`, so it
 * carries its own styles.
 */
@Component({
  selector: 'app-link-drag-chip',
  imports: [FaviconComponent],
  templateUrl: './link-drag-chip.component.html',
  styleUrl: './link-drag-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class LinkDragChipComponent {
  readonly link = input.required<LinkResponse>();
  /** Translated "3 links" badge; empty for one link. */
  readonly count = input('');

  protected readonly favicon = computed(() => ownImageUrl(this.link().faviconUrl));
  protected readonly letter = computed(() => siteLetter(this.link().url));
}
