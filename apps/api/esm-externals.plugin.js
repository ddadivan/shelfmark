/**
 * Keeps every bare package import external as a static ESM `import` (issue #11).
 *
 * `NxAppWebpackPlugin` (`externalDependencies: 'all'`) declares externals as `commonjs`,
 * which webpack's ESM output turns into `createRequire(import.meta.url)("pkg")`. NestJS 12 is
 * ESM-only, and the Vercel Node runtime rejects `require()` of an ES module
 * (`ERR_REQUIRE_ESM`) even though plain Node 26 allows it. Static `import`s also let Vercel's
 * file tracer copy the packages into the function.
 *
 * Must be listed after `NxAppWebpackPlugin`, so it replaces the externals Nx sets.
 */
const BARE_SPECIFIER =
  /^(?:node:)?(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(?:\/.*)?$/;

class EsmExternalsPlugin {
  apply(compiler) {
    compiler.options.externalsType = 'module';
    compiler.options.externals = [
      ({ request }, callback) => {
        if (request && BARE_SPECIFIER.test(request)) {
          callback(null, `module ${request}`);
          return;
        }
        callback();
      },
    ];
  }
}

module.exports = { EsmExternalsPlugin };
