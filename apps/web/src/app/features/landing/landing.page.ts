import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-landing-page',
  imports: [TranslocoPipe],
  templateUrl: './landing.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LandingPage {}
