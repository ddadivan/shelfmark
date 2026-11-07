import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * The "before" board: scraps of Saved Messages, tabs, a sticky note and a bookmarks bar.
 * A static final frame; the drifting and the "+1" ping are added later (#105).
 */
@Component({
  selector: 'app-landing-before-scene',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-before-scene.component.html',
  styleUrl: './landing-before-scene.component.scss',
})
export class LandingBeforeSceneComponent {}
