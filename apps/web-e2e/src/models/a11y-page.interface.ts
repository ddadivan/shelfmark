export interface A11yPage {
  path: string;
  /** Accessible name of the level-1 heading that proves the page rendered. */
  heading: string;
  /** Only served by the static `e2e` build (CI without BASE_URL). */
  ciOnly?: boolean;
  /** Accessible name of a button that opens an overlay to scan together with the page. */
  overlayOpener?: string;
}
