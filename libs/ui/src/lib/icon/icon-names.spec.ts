import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ICON_NAMES } from './models/icon-names.const';

// The unit-test builder bundles specs, so `import.meta.url` / `__dirname` no longer point at
// the source folder; Nx runs executors from the workspace root.
const SPRITE_PATH = resolve(process.cwd(), 'libs/ui/src/assets/icons/sprite.svg');
const DESIGN_SPRITE_PATH = resolve(process.cwd(), 'docs/design/assets/icons/sprite.svg');

const PROVIDER_SYMBOLS = /<symbol id="sm-(?:google|github)"[\s\S]*?<\/symbol>/g;

describe('ICON_NAMES', () => {
  it('matches the symbol ids of the sprite exactly', () => {
    const sprite = readFileSync(SPRITE_PATH, 'utf8');
    const ids = [...sprite.matchAll(/<symbol id="sm-([a-z0-9-]+)"/g)].map((m) => m[1]);

    expect([...ICON_NAMES].sort()).toEqual([...ids].sort());
    expect(ICON_NAMES).toHaveLength(46);
  });

  it('has no duplicates', () => {
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length);
  });

  it('keeps the sprite free of stroke and root inline styles', () => {
    const sprite = readFileSync(SPRITE_PATH, 'utf8');

    expect(sprite).not.toContain('stroke');
    expect(sprite).not.toContain('style=');
  });

  it('is the design sprite without the root display:none style, plus the provider marks', () => {
    const design = readFileSync(DESIGN_SPRITE_PATH, 'utf8').replace(' style="display:none"', '');
    const withoutMarks = readFileSync(SPRITE_PATH, 'utf8').replace(PROVIDER_SYMBOLS, '');

    expect(withoutMarks).toBe(design);
  });

  it('draws GitHub in currentColor and Google with its own fixed brand colours', () => {
    const sprite = readFileSync(SPRITE_PATH, 'utf8');
    const symbol = (id: string) =>
      sprite.match(new RegExp(`<symbol id="sm-${id}"[\\s\\S]*?</symbol>`))?.[0] ?? '';

    expect(symbol('github')).not.toContain('fill=');
    expect(symbol('google').match(/fill="#[0-9A-F]{6}"/g)).toHaveLength(4);
  });
});
