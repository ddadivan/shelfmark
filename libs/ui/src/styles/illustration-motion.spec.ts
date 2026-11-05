import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { compileString } from 'sass';

const STYLES_PATH = 'libs/ui/src/styles';

function findStylesDir(): string {
  const direct = import.meta.dirname;
  if (direct && existsSync(resolve(direct, '_ui.scss'))) {
    return direct;
  }
  for (let dir = process.cwd(); ; dir = dirname(dir)) {
    const candidate = resolve(dir, STYLES_PATH);
    if (existsSync(resolve(candidate, '_ui.scss'))) {
      return candidate;
    }
    if (dirname(dir) === dir) {
      throw new Error(`Cannot find ${STYLES_PATH} from ${process.cwd()}`);
    }
  }
}

function css(snippet: string): string {
  return compileString(`@use 'ui' as *;\n${snippet}`, { loadPaths: [findStylesDir()] }).css;
}

describe('illustration motion', () => {
  it('defines the scene keyframes once, with the ui-ill prefix and no px', () => {
    const out = css('@include illustration-keyframes;');
    const names = [...out.matchAll(/@keyframes (\S+)/g)].map((m) => m[1]);
    expect(names).toEqual([
      'ui-ill-fly',
      'ui-ill-fly-loop',
      'ui-ill-grow',
      'ui-ill-grow-loop',
      'ui-ill-type',
      'ui-ill-type-loop',
      'ui-ill-fade',
      'ui-ill-fade-loop',
      'ui-ill-shift',
    ]);
    expect(out).not.toMatch(/\d+px/);
  });

  it('keeps the loop cycle between 3 and 5 seconds', () => {
    const out = css('.a { --loop: #{$illustration-loop-duration}; }');
    const seconds = Number(/--loop:\s*([\d.]+)s/.exec(out)?.[1]);
    expect(seconds).toBeGreaterThanOrEqual(3);
    expect(seconds).toBeLessThanOrEqual(5);
  });
});
