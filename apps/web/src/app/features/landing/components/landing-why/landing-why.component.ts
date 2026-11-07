import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AVATAR_SIZE, AvatarComponent } from '@shelfmark/ui';

/** "Why this exists": the author's quote. */
@Component({
  selector: 'app-landing-why',
  imports: [TranslocoPipe, AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-why.component.html',
  styleUrl: './landing-why.component.scss',
})
export class LandingWhyComponent {
  protected readonly AVATAR_SIZE = AVATAR_SIZE;
}
