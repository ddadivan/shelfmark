// The extension's background service worker (manifest `background.service_worker`, a module):
// right-click "Save link to Shelfmark" / "Save page to Shelfmark". Bundled on its own by
// `scripts/build-worker.mjs`, not by the Angular build of the popup.
import { registerContextMenu } from './context-menu';

registerContextMenu();
