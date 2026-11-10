import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent, ICON_SIZE, IconComponent } from '@shelfmark/ui';
import { HowItWorksService } from '../how-it-works.service';

/**
 * "New here? Watch how it works" at the bottom of the desktop sidebar (HowItWorks.dc.html,
 * board 2), during the first two weeks until watched or hidden.
 */
@Component({
  selector: 'app-how-it-works-card',
  imports: [ButtonComponent, IconComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './how-it-works-card.component.html',
  styleUrl: './how-it-works-card.component.scss',
})
export class HowItWorksCardComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly howItWorks = inject(HowItWorksService);
}
