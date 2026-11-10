import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SIGN_IN_TILE_MARK } from './models/sign-in-tile-mark.const';
import { SIGN_IN_TILES } from './models/sign-in-tiles.const';

/**
 * Decorative band of eight link tiles on top of the phone sign-in page
 * (docs/design/screens/MobileSignIn.dc.html). The tiles assemble once, their marks pop in, and
 * then one tile at a time "lands" like a newly saved link (a lift and an accent ring, a 24 s
 * loop). With `prefers-reduced-motion` the tiles stay still. Hidden from assistive technology:
 * nothing in it is focusable. The desktop page has `SignInDriftComponent` instead.
 */
@Component({
  selector: 'app-sign-in-mosaic',
  templateUrl: './sign-in-mosaic.component.html',
  styleUrl: './sign-in-mosaic.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class SignInMosaicComponent {
  protected readonly SIGN_IN_TILES = SIGN_IN_TILES;
  protected readonly SIGN_IN_TILE_MARK = SIGN_IN_TILE_MARK;
}
