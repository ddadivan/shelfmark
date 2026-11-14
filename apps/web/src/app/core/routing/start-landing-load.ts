import { loadLandingPage } from '../../features/landing/load-landing-page';
import { APP_PATH } from '../../models/app-path.const';

const LANDING_PATHS: readonly string[] = ['/', `/${APP_PATH.About}`];

/**
 * Starts the landing chunk before Angular has even bootstrapped, when the address is a landing
 * page. The landing is the LCP page, but it is a lazy chunk so that the initial bundle stays small
 * (#339); this makes the chunk travel in parallel with the session request that decides between
 * landing and app (the route's `canMatch`), instead of after it. A signed-in person on `/` loads
 * one chunk they do not need; the browser keeps the module, so the router's later `import()` of the
 * same file costs nothing.
 */
export function startLandingLoad(
  location: Pick<Location, 'pathname'> = globalThis.location,
  load: () => Promise<unknown> = loadLandingPage,
): void {
  if (LANDING_PATHS.includes(location.pathname.replace(/(?<=.)\/$/, ''))) {
    void load().catch(() => undefined);
  }
}
