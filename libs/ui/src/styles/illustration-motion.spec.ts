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
      'ui-ill-twinkle',
      'ui-ill-drift',
      'ui-ill-bob',
      'ui-ill-pulse',
      'ui-ill-ring',
      'ui-ill-lid',
      'ui-ill-hand',
      'ui-ill-swing',
      'ui-ill-wave',
      'ui-ill-flap',
      'ui-ill-wobble',
      'ui-ill-shackle',
      'ui-ill-ribbon',
      'ui-ill-hop',
      'ui-ill-slide-in',
      'ui-ill-scan',
      'ui-ill-pick',
    ]);
    expect(out).not.toMatch(/\d+px/);
  });

  it('has a part for every keyframes, each cycle between 1.4 and 5 seconds', () => {
    const out = css(
      '@each $name, $c in $illustration-parts { .#{$name} { --d: #{map-get($c, "duration")}; } }',
    );
    const parts = [...out.matchAll(/\.([\w-]+) \{\s*--d:\s*([\d.]+)s/g)];
    expect(parts.map((m) => `ui-ill-${m[1]}`).sort()).toEqual(
      [...css('@include illustration-keyframes;').matchAll(/@keyframes (\S+)/g)]
        .map((m) => m[1])
        .sort(),
    );
    for (const [, , seconds] of parts) {
      expect(Number(seconds)).toBeGreaterThanOrEqual(1.4);
      expect(Number(seconds)).toBeLessThanOrEqual(5);
    }
  });

  it('turns grid units into a percentage of the 120 viewBox', () => {
    const out = css('.a { x: illustration-unit(60); y: illustration-unit(-14); }');
    expect(out).toContain('x: 50%');
    expect(out).toMatch(/y: -11\.66666/);
  });
});
