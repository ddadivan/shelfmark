import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ICON_NAMES } from './models/icon-names.const';

// The unit-test builder bundles specs, so `import.meta.url` / `__dirname` no longer point at
// the source folder; Nx runs executors from the workspace root.
const ROOT = process.cwd();
const SPRITE_PATH = resolve(ROOT, 'libs/ui/src/assets/icons/sprite.svg');
const SOURCES_DIR = resolve(ROOT, 'libs/ui/src/icons');
const DESIGN_DIR = resolve(ROOT, 'docs/design/assets/icons');

/** Brand marks: the only symbols that may carry `fill`, and not part of the design set. */
const PROVIDER_ICONS = ['google', 'github'];
/** Keyboard key glyphs drawn for this app (no design file; the fonts have no such glyphs). */
const KEY_ICONS = ['key-command', 'key-enter', 'key-option', 'key-shift'];
/** Other glyphs drawn for this app where the design set has none (#270: the video play button). */
const APP_ICONS = ['play'];

const sprite = readFileSync(SPRITE_PATH, 'utf8');

/** The drawing inside a source `<svg>`, with the root element and root-level `fill` removed. */
function inner(svg: string): string {
  return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

function symbol(name: string): string {
  return sprite.match(new RegExp(`<symbol id="sm-${name}"[^>]*>([\\s\\S]*?)</symbol>`))?.[1] ?? '';
}

describe('ICON_NAMES', () => {
  it('matches the symbol ids of the sprite exactly, sorted', () => {
    const ids = [...sprite.matchAll(/<symbol id="sm-([a-z0-9-]+)"/g)].map((m) => m[1]);

    expect([...ICON_NAMES]).toEqual(ids);
    expect([...ICON_NAMES]).toEqual([...ICON_NAMES].sort());
  });

  it('has one source file per icon and no duplicates', () => {
    const files = readdirSync(SOURCES_DIR)
      .filter((file) => file.endsWith('.svg'))
      .map((file) => file.slice(0, -4))
      .sort();

    expect(files).toEqual([...ICON_NAMES]);
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length);
  });

  it('has the 44 design icons, the 2 brand marks, the key glyphs and the app glyphs', () => {
    expect(ICON_NAMES).toHaveLength(
      44 + PROVIDER_ICONS.length + KEY_ICONS.length + APP_ICONS.length,
    );
  });

  it('keeps the sprite free of stroke, styles and active content', () => {
    expect(sprite).not.toContain('stroke');
    expect(sprite).not.toContain('style=');
    expect(sprite).not.toContain('<script');
    expect(sprite).not.toContain('<foreignObject');
    expect(sprite).not.toContain('href=');
  });

  it('draws every symbol on the 24px grid', () => {
    expect(sprite.match(/<symbol /g)).toHaveLength(ICON_NAMES.length);
    expect(sprite.match(/<symbol id="sm-[a-z0-9-]+" viewBox="0 0 24 24">/g)).toHaveLength(
      ICON_NAMES.length,
    );
  });

  it('keeps the generated files in sync with the sources (scripts/build-icon-sprite.mjs --check)', () => {
    expect(() =>
      execFileSync('node', [resolve(ROOT, 'scripts/build-icon-sprite.mjs'), '--check'], {
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });
});

describe('design parity', () => {
  const designFiles = readdirSync(DESIGN_DIR).filter((file) => /^sm-.+\.svg$/.test(file));

  it('covers every design icon', () => {
    expect(designFiles).toHaveLength(44);
  });

  it.each(designFiles)('%s is drawn exactly like its sprite symbol', (file) => {
    const name = file.slice(3, -4);
    const design = inner(readFileSync(resolve(DESIGN_DIR, file), 'utf8'));

    expect(symbol(name)).toBe(design);
    expect(inner(readFileSync(resolve(SOURCES_DIR, `${name}.svg`), 'utf8'))).toBe(design);
  });
});

describe('brand marks and key glyphs', () => {
  it('draws GitHub in currentColor and Google with its own fixed brand colours', () => {
    expect(symbol('github')).not.toContain('fill=');
    expect(symbol('google').match(/fill="#[0-9A-F]{6}"/g)).toHaveLength(4);
  });

  it('allows fill on the brand marks only', () => {
    for (const name of ICON_NAMES.filter((n) => !PROVIDER_ICONS.includes(n))) {
      expect(symbol(name), name).not.toContain('fill="');
    }
  });

  it.each([...KEY_ICONS, ...APP_ICONS])('%s is a filled shape without colour', (name) => {
    expect(symbol(name)).toMatch(/^<path /);
    expect(symbol(name)).not.toContain('fill="');
  });
});
