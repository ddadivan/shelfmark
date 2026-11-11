import { loadLibraryPage } from '../../features/library/load-library-page';

let started = false;

/**
 * Starts loading the app shell and the library page (lazy chunks) without waiting for a
 * navigation, so the first frame of the app does not wait for them. Called when a person is about
 * to enter the app (a hover or focus on "Back to my shelf" / "Open the demo", the demo start).
 * Once is enough: the browser keeps the modules.
 */
export function preloadAppChunks(): void {
  if (started) {
    return;
  }
  started = true;
  void import('../../shell/app-shell.component').catch(() => undefined);
  void loadLibraryPage().catch(() => undefined);
}
