/**
 * Keeps every bare package import external as a static ESM `import` (issue #11).
 *
 * `NxAppWebpackPlugin` (`externalDependencies: 'all'`) declares externals as `commonjs`,
 * which webpack's ESM output turns into `createRequire(import.meta.url)("pkg")`. NestJS 12 is
 * ESM-only, and the Vercel Node runtime rejects `require()` of an ES module
 * (`ERR_REQUIRE_ESM`) even though plain Node 26 allows it. Static `import`s also let Vercel's
 * file tracer copy the packages into the function.
 *
 * Workspace libraries (`@shelfmark/*`, TypeScript path aliases) are always bundled: they do
 * not exist in node_modules at runtime.
 *
 * Must be listed after `NxAppWebpackPlugin`, so it replaces the externals Nx sets.
 */
const BUNDLED_PREFIX = '@shelfmark/';

/** A bare package specifier: not relative, not absolute, not a webpack-internal request. */
function isExternalPackage(request) {
  return (
    typeof request === 'string' &&
    request.length > 0 &&
    !request.startsWith('.') &&
    !request.startsWith('/') &&
    !request.includes('!') &&
    !request.startsWith(BUNDLED_PREFIX)
  );
}

class EsmExternalsPlugin {
  apply(compiler) {
    if (!compiler.options.externals) {
      throw new Error('EsmExternalsPlugin must run after NxAppWebpackPlugin sets externals.');
    }
    compiler.options.externalsType = 'module';
    compiler.options.externals = [
      ({ request }, callback) => {
        if (isExternalPackage(request)) {
          callback(null, `module ${request}`);
          return;
        }
        callback();
      },
    ];
  }
}

module.exports = { EsmExternalsPlugin };
