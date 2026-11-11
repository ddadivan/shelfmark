import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  CUSTOM_THEME_ACCENT,
  CUSTOM_THEME_BACKGROUNDS,
  CUSTOM_THEME_BASE,
  CUSTOM_THEME_CORNERS,
  type CustomThemeBase,
} from '@shelfmark/contracts';
import { compileString } from 'sass';
import {
  CUSTOM_THEME_SURFACES,
  THEME_ATTRIBUTE,
  THEME_CUSTOM,
  customAccentTokens,
  isAccessibleAccent,
  nearestAccessibleAccent,
} from '../lib/theme';

/**
 * WCAG AA for every Custom theme combination (issue #273), computed from the token values in
 * `tokens/_custom.scss` on top of the light / dark base (`tokens/_light.scss`, `_dark.scss`).
 * The allow-lists come from the contracts, so a new accent or background without checked values
 * fails here. Criteria (BRAND.md, Colour):
 * - text and text-muted: 4.5:1 on bg, surface, surface-hover, surface-pressed and accent-bg;
 * - accent-text: 4.5:1 on accent-bg, surface and bg (tag chips, the active folder);
 * - accent: 4.5:1 on bg and surface (links), 3:1 on surface-hover, surface-pressed and accent-bg;
 * - focus-ring: 3:1 on bg, surface, surface-hover and accent-bg;
 * - border-control: 3:1 on bg and surface (form boundaries).
 */

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

type Tokens = Record<string, string>;

/** Compiles the base themes and the custom rules; returns the declarations by selector. */
function compileRules(): Map<string, Tokens> {
  const css = compileString(
    `@use 'ui' as *;\n.base-light { @include light; }\n.base-dark { @include dark; }\n@include custom-themes;`,
    { loadPaths: [findStylesDir()] },
  ).css;
  const rules = new Map<string, Tokens>();
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const tokens: Tokens = {};
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      tokens[name] = value.trim();
    }
    rules.set(selector.trim(), { ...rules.get(selector.trim()), ...tokens });
  }
  return rules;
}

function luminance(hex: string): number {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? [...raw].map((c) => c + c).join('') : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) {
    throw new Error(`Not an opaque hex colour: ${hex}`);
  }
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const RULES = compileRules();
const custom = (attrs: string) => `[${THEME_ATTRIBUTE}=${THEME_CUSTOM}]${attrs}`;
const rule = (selector: string): Tokens => {
  const found = RULES.get(selector);
  if (!found) {
    throw new Error(`Missing rule ${selector}`);
  }
  return found;
};

const COMBINATIONS = Object.values(CUSTOM_THEME_BASE).flatMap((base) =>
  Object.values(CUSTOM_THEME_ACCENT).flatMap((accent) =>
    CUSTOM_THEME_BACKGROUNDS[base].map((background) => ({ base, accent, background })),
  ),
);

function tokensOf(base: CustomThemeBase, accent: string, background: string): Tokens {
  return {
    ...rule(`.base-${base}`),
    ...rule(custom(`[data-custom-base=${base}][data-custom-accent=${accent}]`)),
    ...rule(custom(`[data-custom-base=${base}][data-custom-background=${background}]`)),
  };
}

describe('Custom theme tokens', () => {
  it('has a rule for every base, accent, background and corners of the contracts, and no other', () => {
    expect(rule(custom(''))['--bg']).toBe(rule('.base-light')['--bg']);
    expect(rule(custom('[data-custom-base=dark]'))['--bg']).toBe(rule('.base-dark')['--bg']);
    const accents = [...RULES.keys()].filter((s) => s.includes('data-custom-accent'));
    expect(accents).toHaveLength(
      Object.values(CUSTOM_THEME_BASE).length * Object.values(CUSTOM_THEME_ACCENT).length,
    );
    const backgrounds = [...RULES.keys()].filter((s) => s.includes('data-custom-background'));
    expect(backgrounds.sort()).toEqual(
      Object.entries(CUSTOM_THEME_BACKGROUNDS)
        .flatMap(([base, names]) =>
          names.map((n) => custom(`[data-custom-base=${base}][data-custom-background=${n}]`)),
        )
        .sort(),
    );
    for (const corners of Object.values(CUSTOM_THEME_CORNERS)) {
      const radii = rule(custom(`[data-custom-corners=${corners}]`));
      for (const size of ['sm', 'md', 'lg', 'xl', 'fab']) {
        expect(radii[`--radius-${size}`]).toMatch(/^[\d.]+rem$/);
      }
      expect(radii['--radius-full']).toBeUndefined();
    }
  });

  it('keeps the round corners equal to the fixed scale', () => {
    const scale = compileString(`@use 'ui' as *;\n.s { @include scale; }`, {
      loadPaths: [findStylesDir()],
    }).css;
    const round = rule(custom('[data-custom-corners=round]'));
    for (const [name, value] of Object.entries(round)) {
      expect(scale).toContain(`${name}: ${value};`);
    }
  });

  it('keeps sage on the default background equal to the fixed themes', () => {
    for (const [base, background] of [
      ['light', 'stone'],
      ['dark', 'graphite'],
    ] as const) {
      const fixed = rule(`.base-${base}`);
      const tokens = tokensOf(base, 'sage', background);
      for (const name of ['--bg', '--accent', '--accent-bg', '--accent-text', '--focus-ring']) {
        expect(tokens[name]?.toLowerCase(), `${base} ${name}`).toBe(fixed[name]?.toLowerCase());
      }
    }
  });

  it.each(COMBINATIONS)(
    'meets WCAG AA: $base base, $accent accent, $background background',
    ({ base, accent, background }) => {
      const t = tokensOf(base, accent, background);
      const failures: string[] = [];
      const check = (fg: string, bgs: string[], min: number): void => {
        for (const bg of bgs) {
          const ratio = contrast(t[fg], t[bg]);
          if (ratio < min) {
            failures.push(`${fg} on ${bg}: ${ratio.toFixed(2)} < ${min}`);
          }
        }
      };
      const surfaces = ['--bg', '--surface', '--surface-hover', '--surface-pressed', '--accent-bg'];
      check('--text', surfaces, 4.5);
      check('--text-muted', surfaces, 4.5);
      check('--accent-text', ['--accent-bg', '--surface', '--bg'], 4.5);
      check('--accent', ['--bg', '--surface'], 4.5);
      check('--accent', ['--surface-hover', '--surface-pressed', '--accent-bg'], 3);
      check('--focus-ring', ['--bg', '--surface', '--surface-hover', '--accent-bg'], 3);
      check('--border-control', ['--bg', '--surface'], 3);
      expect(failures).toEqual([]);
    },
  );

  it('computes contrast like WCAG', () => {
    expect(contrast('#000', '#fff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    expect(() => luminance('rgb(0 0 0)')).toThrow();
  });

  it('keeps the own-colour surfaces equal to the compiled tokens', () => {
    for (const base of Object.values(CUSTOM_THEME_BASE)) {
      const fixed = rule(`.base-${base}`);
      const own = CUSTOM_THEME_SURFACES[base];
      const hex = (value: string | undefined): string | undefined =>
        value && /^#[0-9a-f]{3}$/i.test(value)
          ? `#${[...value.slice(1)].map((c) => c + c).join('')}`.toLowerCase()
          : value?.toLowerCase();
      expect(own.surface).toBe(hex(fixed['--surface']));
      expect(own.surfaceHover).toBe(hex(fixed['--surface-hover']));
      expect(own.surfacePressed).toBe(hex(fixed['--surface-pressed']));
      expect(own.text).toBe(hex(fixed['--text']));
      expect(own.textMuted).toBe(hex(fixed['--text-muted']));
      expect(Object.keys(own.backgrounds).sort()).toEqual(
        [...CUSTOM_THEME_BACKGROUNDS[base]].sort(),
      );
      for (const background of CUSTOM_THEME_BACKGROUNDS[base]) {
        const tokens = rule(
          custom(`[data-custom-base=${base}][data-custom-background=${background}]`),
        );
        expect(own.backgrounds[background], `${base} ${background}`).toBe(hex(tokens['--bg']));
      }
    }
  });
});

/** Own accent colours (#315): a spread of hues, greys and extremes. */
const OWN_COLOURS = [
  '#ff0000',
  '#ffff00',
  '#00ff00',
  '#00ffff',
  '#0000ff',
  '#ff00ff',
  '#ffffff',
  '#000000',
  '#808080',
  '#f5d0e0',
  '#2e6a99',
  '#e6b33c',
  '#4f9a54',
  '#8a5bb5',
  '#e0533f',
  '#7fd1c4',
  '#1a1a1d',
  '#fafafa',
  '#c0ffee',
  '#123456',
  '#abcdef',
  '#ff8800',
  '#663399',
  '#00aa55',
];

describe('own accent colour', () => {
  const grounds = Object.values(CUSTOM_THEME_BASE).flatMap((base) =>
    CUSTOM_THEME_BACKGROUNDS[base].map((background) => ({ base, background })),
  );

  it.each(grounds)(
    'derives AA tokens on the $base base, $background background',
    ({ base, background }) => {
      const page = {
        ...rule(`.base-${base}`),
        ...rule(custom(`[data-custom-base=${base}][data-custom-background=${background}]`)),
      };
      const failures: string[] = [];
      for (const colour of OWN_COLOURS) {
        const t: Tokens = { ...page, ...customAccentTokens(colour, base, background) };
        const check = (fg: string, bgs: string[], min: number): void => {
          for (const bg of bgs) {
            const ratio = contrast(t[fg], t[bg]);
            if (ratio < min) {
              failures.push(`${colour}: ${fg} on ${bg}: ${ratio.toFixed(2)} < ${min}`);
            }
          }
        };
        check('--text', ['--accent-bg'], 4.5);
        check('--text-muted', ['--accent-bg'], 4.5);
        check('--accent-text', ['--accent-bg', '--surface', '--bg'], 4.5);
        check('--accent', ['--bg', '--surface'], 4.5);
        check('--accent', ['--surface-hover', '--surface-pressed', '--accent-bg'], 3);
        check('--focus-ring', ['--bg', '--surface', '--surface-hover', '--accent-bg'], 3);
        expect(
          isAccessibleAccent(nearestAccessibleAccent(colour, base, background), base, background),
        ).toBe(true);
      }
      expect(failures).toEqual([]);
    },
  );

  it('keeps a passing colour and moves a failing one the least way', () => {
    expect(nearestAccessibleAccent('#2E6A99', 'light', 'paper')).toBe('#2e6a99');
    expect(isAccessibleAccent('#2e6a99', 'light', 'paper')).toBe(true);
    expect(isAccessibleAccent('#f5d0e0', 'light', 'paper')).toBe(false);
    const darker = nearestAccessibleAccent('#f5d0e0', 'light', 'paper');
    expect(luminance(darker)).toBeLessThan(luminance('#f5d0e0'));
    expect(isAccessibleAccent('#123456', 'dark', 'ink')).toBe(false);
    expect(luminance(nearestAccessibleAccent('#123456', 'dark', 'ink'))).toBeGreaterThan(
      luminance('#123456'),
    );
    expect(isAccessibleAccent('not a colour', 'light', 'paper')).toBe(false);
  });
});
