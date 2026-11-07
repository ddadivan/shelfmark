/** Any CI run: the e2e build is served and production-only behaviour (CSP) is enforced. */
export function isCiBuild(): boolean {
  return !!process.env['CI'];
}

/** CI serving the static e2e build (no BASE_URL): the hidden test pages exist only there. */
export function isStaticBuild(): boolean {
  return isCiBuild() && !process.env['BASE_URL'];
}
