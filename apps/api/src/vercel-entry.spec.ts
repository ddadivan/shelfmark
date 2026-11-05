import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { join, resolve } from 'node:path';

// Guards issue #11: Vercel's file tracer only copies packages that `api/index.mjs`
// imports statically, so every runtime package of the API must be listed there.

const srcDir = import.meta.dirname;
const entryFile = resolve(srcDir, '../../../api/index.mjs');

/** Packages Nest loads by name at runtime (`loadPackage`), invisible in our imports. */
const RUNTIME_LOADED = ['class-transformer', 'class-validator', 'swagger-ui-dist'];

/** Workspace libraries are bundled by webpack, not loaded from node_modules. */
const BUNDLED_PREFIX = '@shelfmark/';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [path] : [];
  });
}

function packageName(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

// Prettier enforces single quotes, so only single-quoted static imports are parsed.
function runtimeImports(code: string): string[] {
  const specifiers: string[] = [];
  for (const match of code.matchAll(/^import\s+(type\s+)?[^;]*?from\s+'([^']+)'/gm)) {
    if (!match[1]) {
      specifiers.push(match[2]);
    }
  }
  for (const match of code.matchAll(/^import\s+'([^']+)'/gm)) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

function isExternalPackage(specifier: string): boolean {
  return (
    !specifier.startsWith('.') &&
    !specifier.startsWith('node:') &&
    !builtinModules.includes(specifier) &&
    !specifier.startsWith(BUNDLED_PREFIX)
  );
}

describe('Vercel function entry (api/index.mjs)', () => {
  const entryImports = new Set(
    runtimeImports(readFileSync(entryFile, 'utf8')).filter(isExternalPackage).map(packageName),
  );

  it('statically imports every package the API source imports at runtime', () => {
    const needed = new Set(
      sourceFiles(srcDir)
        .flatMap((file) => runtimeImports(readFileSync(file, 'utf8')))
        .filter(isExternalPackage)
        .map(packageName),
    );
    const missing = [...needed].filter((name) => !entryImports.has(name));
    expect(missing).toEqual([]);
  });

  it('statically imports the packages Nest loads by name', () => {
    const missing = RUNTIME_LOADED.filter((name) => !entryImports.has(name));
    expect(missing).toEqual([]);
  });

  // Runs only after `nx build api`: checks the externals webpack actually emitted.
  const bundle = resolve(srcDir, '../../../dist/apps/api/vercel-handler.mjs');
  it.skipIf(!existsSync(bundle))(
    'statically imports every external the built bundle requires',
    () => {
      const required = [
        ...readFileSync(bundle, 'utf8').matchAll(/createRequire_require\("([^"]+)"\)/g),
      ]
        .map((match) => match[1])
        .filter(isExternalPackage)
        .map(packageName);
      const missing = [...new Set(required)].filter((name) => !entryImports.has(name));
      expect(missing).toEqual([]);
    },
  );

  it('re-exports the handler bundle as the default export', () => {
    expect(readFileSync(entryFile, 'utf8')).toMatch(
      /export \{ default \} from '\.\.\/dist\/apps\/api\/vercel-handler\.mjs';/,
    );
  });
});
