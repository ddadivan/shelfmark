import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import webpack from 'webpack';
import { EsmExternalsPlugin } from '../esm-externals.plugin.js';

type ExternalsFunction = (
  data: { request: string },
  callback: (error?: Error | null, result?: string) => void,
) => void;

const QUERY_COMPILER = '@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs';
const QUERY_COMPILER_WASM =
  '@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs';

function externalFor(request: string): string | undefined {
  const options = { externals: [] as unknown[], externalsType: '' };
  new EsmExternalsPlugin().apply({ options });
  const [external] = options.externals as ExternalsFunction[];
  let result: string | undefined;
  external({ request }, (_error, value) => {
    result = value;
  });
  return result;
}

describe('EsmExternalsPlugin', () => {
  it.each([QUERY_COMPILER, QUERY_COMPILER_WASM, 'node:buffer'])(
    'keeps %s a real dynamic import',
    (request) => {
      expect(externalFor(request)).toBe(`import ${request}`);
    },
  );

  it.each(['@nestjs/core', '@prisma/client/runtime/client', 'express'])(
    'keeps %s a static module import',
    (request) => {
      expect(externalFor(request)).toBe(`module ${request}`);
    },
  );

  it.each(['./local', '../up', '/abs/path', '@shelfmark/contracts'])('bundles %s', (request) => {
    expect(externalFor(request)).toBeUndefined();
  });

  it('requires the externals set by NxAppWebpackPlugin', () => {
    expect(() => new EsmExternalsPlugin().apply({ options: {} })).toThrow(
      /after NxAppWebpackPlugin/,
    );
  });

  describe('in a real webpack compile', () => {
    let dir: string;

    beforeAll(() => {
      dir = mkdtempSync(join(tmpdir(), 'esm-externals-'));
    });

    afterAll(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it('emits no numbered async chunks for the Prisma query compiler import', async () => {
      writeFileSync(
        join(dir, 'entry.js'),
        `export const load = () => import('${QUERY_COMPILER}');\n` +
          `export const buffer = () => import('node:buffer');\n`,
      );
      const stats = await new Promise<webpack.Stats | undefined>((resolve, reject) => {
        webpack(
          {
            mode: 'production',
            target: 'node',
            context: dir,
            entry: { entry: join(dir, 'entry.js') },
            output: {
              path: join(dir, 'out'),
              module: true,
              chunkFormat: 'module',
              library: { type: 'module' },
              filename: '[name].mjs',
            },
            experiments: { outputModule: true },
            externals: [() => undefined],
            plugins: [new EsmExternalsPlugin()],
          },
          (error, result) => (error ? reject(error) : resolve(result)),
        );
      });
      expect(stats?.hasErrors()).toBe(false);
      expect(readdirSync(join(dir, 'out')).filter((file) => file !== 'entry.mjs')).toEqual([]);
      const code = readFileSync(join(dir, 'out', 'entry.mjs'), 'utf8');
      expect(code).toContain(`import("${QUERY_COMPILER}")`);
      expect(code).toContain('import("node:buffer")');
    });
  });
});
