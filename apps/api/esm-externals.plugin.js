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
 * not exist in node_modules at runtime. So are the CommonJS packages in `BUNDLED_CJS_PACKAGES`
 * (see there).
 *
 * Prisma's query compiler is loaded with a dynamic `import("@prisma/client/runtime/query_compiler_...")`.
 * Webpack would turn that into numbered async chunks (`2.js`, `3.js`) that Vercel's tracer does not
 * copy, so those requests (and its `node:buffer` import) stay real dynamic imports from node_modules (`includeFiles` in
 * vercel.json ships the files).
 *
 * Must be listed after `NxAppWebpackPlugin`, so it replaces the externals Nx sets.
 */
const BUNDLED_PREFIX = '@shelfmark/';
/**
 * CommonJS packages that `require()` an ESM-only NestJS package. Kept external, Vercel loads them
 * with its own CommonJS loader and fails with `ERR_REQUIRE_ESM`. Bundled, webpack turns that
 * `require('@nestjs/common')` into the same static ESM import as everywhere else.
 */
const BUNDLED_CJS_PACKAGES = ['@nestjs/throttler'];

function isBundledCjs(request) {
  return BUNDLED_CJS_PACKAGES.some((name) => request === name || request.startsWith(`${name}/`));
}
const PRISMA_QUERY_COMPILER_PREFIX = '@prisma/client/runtime/query_compiler';
/** Prisma's runtime only loads this built-in with `await import(...)`; a chunk for it is useless. */
const DYNAMIC_BUILTINS = new Set(['node:buffer']);

function isDynamicImport(request) {
  return (
    typeof request === 'string' &&
    (request.startsWith(PRISMA_QUERY_COMPILER_PREFIX) || DYNAMIC_BUILTINS.has(request))
  );
}

/** A bare package specifier: not relative, not absolute, not a webpack-internal request. */
function isExternalPackage(request) {
  return (
    typeof request === 'string' &&
    request.length > 0 &&
    !request.startsWith('.') &&
    !request.startsWith('/') &&
    !request.includes('!') &&
    !request.startsWith(BUNDLED_PREFIX) &&
    !isBundledCjs(request)
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
        if (isDynamicImport(request)) {
          callback(null, `import ${request}`);
          return;
        }
        if (isExternalPackage(request)) {
          callback(null, `module ${request}`);
          return;
        }
        callback();
      },
    ];
  }
}

module.exports = { EsmExternalsPlugin, BUNDLED_CJS_PACKAGES };
