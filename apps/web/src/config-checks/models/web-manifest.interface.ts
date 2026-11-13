import type { WebManifestIcon } from './web-manifest-icon.interface';
import type { WebShareTarget } from './web-share-target.interface';

/** The fields of `apps/web/public/manifest.webmanifest` the config checks read. */
export interface WebManifest {
  readonly id: string;
  readonly name: string;
  readonly short_name: string;
  readonly start_url: string;
  readonly scope: string;
  readonly display: string;
  readonly theme_color: string;
  readonly background_color: string;
  readonly icons: readonly WebManifestIcon[];
  readonly share_target?: WebShareTarget;
}
