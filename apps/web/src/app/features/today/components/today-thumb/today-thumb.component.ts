import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import type { LinkResponse } from '@shelfmark/contracts';
import { ownImageUrl, siteLetter } from '../../../links/utils/link-view';

/**
 * The small preview of a link in the Today rows (Shelf `.thumb`): its captured image, cropped, or
 * the site letter on a soft fill when there is none or it fails. Decorative: the title beside it
 * names the link.
 */
@Component({
  selector: 'app-today-thumb',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'today-thumb', 'aria-hidden': 'true' },
  templateUrl: './today-thumb.component.html',
  styleUrl: './today-thumb.component.scss',
})
export class TodayThumbComponent {
  readonly link = input.required<LinkResponse>();

  protected readonly failed = linkedSignal({ source: this.link, computation: () => false });
  protected readonly src = computed(() =>
    this.failed() ? undefined : ownImageUrl(this.link().imageUrl),
  );
  protected readonly letter = computed(() => siteLetter(this.link().url));
}
