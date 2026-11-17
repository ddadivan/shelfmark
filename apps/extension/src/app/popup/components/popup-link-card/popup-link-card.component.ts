import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { LinkResponse } from '@shelfmark/contracts';
import { CardComponent, ChipComponent, FaviconComponent } from '@shelfmark/ui';
import { toAppAsset } from '../../utils/to-app-asset';

/** The saved link as its library card: image, site, title and tags. */
@Component({
  selector: 'ext-popup-link-card',
  templateUrl: './popup-link-card.component.html',
  styleUrl: './popup-link-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, ChipComponent, FaviconComponent],
})
export class PopupLinkCardComponent {
  readonly link = input.required<LinkResponse>();
  readonly activated = output<void>();

  protected readonly image = computed(() => toAppAsset(this.link().imageUrl));
  protected readonly favicon = computed(() => toAppAsset(this.link().faviconUrl));
  protected readonly host = computed(() =>
    new URL(this.link().url).hostname.replace(/^www\./u, ''),
  );
  protected readonly letter = computed(() => this.host().charAt(0).toUpperCase());
}
