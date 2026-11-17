import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LogoComponent, SkeletonComponent } from '@shelfmark/ui';
import { PopupStore } from '../../popup.store';

/** State 3: a skeleton in the shape of the form, shown only when loading is slow. */
@Component({
  selector: 'ext-popup-opening',
  templateUrl: './popup-opening.component.html',
  styleUrl: './popup-opening.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ext-screen', 'aria-busy': 'true' },
  imports: [LogoComponent, SkeletonComponent, TranslocoPipe],
})
export class PopupOpeningComponent {
  protected readonly store = inject(PopupStore);
}
