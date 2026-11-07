import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LandingChatComponent } from '../landing-chat/landing-chat.component';

/** First screen: the headline with its lead and the "Saved Messages" demo. */
@Component({
  selector: 'app-landing-hero',
  imports: [TranslocoPipe, LandingChatComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-hero.component.html',
  styleUrl: './landing-hero.component.scss',
})
export class LandingHeroComponent {}
