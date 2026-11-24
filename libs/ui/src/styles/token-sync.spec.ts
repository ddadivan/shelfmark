import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { compileString } from 'sass';
import { CUSTOM_THEME_ATTRIBUTE, THEME_ATTRIBUTE, THEME_CUSTOM } from '../lib/models/theme';
import { contrastRatio } from '../lib/utils/colour-contrast';
import { CODE_ONLY_TOKENS } from './models/code-only-tokens.const';
import { CONTRAST_PAIRS } from './models/contrast-pairs.const';
import { TOKEN_RENAMES } from './models/token-renames.const';

/**
 * DS guard, token sync (ADR 0063): the compiled libs/ui tokens must carry the values of
 * docs/design-next/shelf/design-system/tokens.json — every colour in both themes, the radii,
 * the type scale (size and line height), the shadows and the spacing. Renamed tokens are mapped
 * in `TOKEN_RENAMES`; a token on one side only fails unless `CODE_ONLY_TOKENS` gives a reason.
 * Values are compared after normalising (case, `#fff` / `#FFFFFF`, `rgba(0,0,0,0.4)` /
 * `rgb(0 0 0 / 40%)`, px / rem, `.875rem` / `0.875rem`) and resolving `var()` aliases.
 */

type Theme = 'light' | 'dark';
type Tokens = Map<string, string>;

const THEMES: readonly Theme[] = ['light', 'dark'];
const STYLES_PATH = 'libs/ui/src/styles';
const DESIGN_TOKENS = '../../../../docs/design-next/shelf/design-system/tokens.json';

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

const STYLES_DIR = findStylesDir();

// ---------------------------------------------------------------- design side (tokens.json)

interface DesignThemed {
  readonly name: string;
  readonly value: string | Readonly<Record<Theme, string>>;
}

interface DesignTypeStyle {
  readonly name: string;
  readonly fontSize: string;
  readonly lineHeight: string | number;
}

interface DesignFile {
  readonly color: { readonly tokens: readonly DesignThemed[] };
  readonly type: { readonly groups: readonly { readonly styles: readonly DesignTypeStyle[] }[] };
  readonly spacing: { readonly tokens: readonly DesignThemed[] };
  readonly radius: { readonly tokens: readonly DesignThemed[] };
  readonly shadow: { readonly tokens: readonly DesignThemed[] };
}

const design = JSON.parse(readFileSync(resolve(STYLES_DIR, DESIGN_TOKENS), 'utf8')) as DesignFile;

/** One expected value: a libs/ui property (without `--`) and its value per theme. */
interface Expected {
  readonly category: 'colour' | 'radius' | 'type' | 'shadow' | 'spacing';
  readonly design: string;
  readonly code: string;
  readonly value: Readonly<Record<Theme, string>>;
}

const both = (value: string | number): Record<Theme, string> => ({
  light: String(value),
  dark: String(value),
});
const themed = (value: DesignThemed['value']): Record<Theme, string> =>
  typeof value === 'string' ? both(value) : { light: value.light, dark: value.dark };
const codeName = (name: string): string => TOKEN_RENAMES[name] ?? name;

// Settings accent variants (`accent-ink`, `accent-sage-bg`) live in the Custom theme rules.
const ACCENT_VARIANT = /^accent-(?<variant>[a-z]+)(?<bg>-bg)?$/;
const isAccentVariant = (name: string): boolean =>
  ACCENT_VARIANT.test(name) && !['accent-bg', 'accent-text'].includes(name);

const expected: Expected[] = [
  ...design.color.tokens
    .filter((t) => !isAccentVariant(t.name))
    .map((t): Expected => ({
      category: 'colour',
      design: t.name,
      code: codeName(t.name),
      value: themed(t.value),
    })),
  ...design.radius.tokens.map((t): Expected => ({
    category: 'radius',
    design: t.name,
    code: codeName(t.name),
    value: themed(t.value),
  })),
  ...design.spacing.tokens.map((t): Expected => ({
    category: 'spacing',
    design: t.name,
    code: codeName(t.name),
    value: themed(t.value),
  })),
  ...design.shadow.tokens.map((t): Expected => ({
    category: 'shadow',
    design: t.name,
    code: codeName(t.name),
    value: themed(t.value),
  })),
  ...design.type.groups
    .flatMap((group) => group.styles)
    .flatMap((style): Expected[] => [
      {
        category: 'type',
        design: `${style.name} fontSize`,
        code: `font-size-${style.name}`,
        value: both(style.fontSize),
      },
      {
        category: 'type',
        design: `${style.name} lineHeight`,
        code: `line-height-${style.name}`,
        value: both(style.lineHeight),
      },
    ]),
];

// ---------------------------------------------------------------- code side (compiled Sass)

/** Declarations per selector of a compiled snippet. */
function compileRules(snippet: string): Map<string, Tokens> {
  const css = compileString(`@use 'ui' as *;\n${snippet}`, { loadPaths: [STYLES_DIR] }).css;
  const rules = new Map<string, Tokens>();
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const tokens = rules.get(selector.trim()) ?? new Map<string, string>();
    for (const [, name, value] of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      tokens.set(name, value.trim().replace(/\s+/g, ' '));
    }
    rules.set(selector.trim(), tokens);
  }
  return rules;
}

const compiled = compileRules(
  `.scale { @include scale; } .light { @include light; } .dark { @include dark; } @include custom-themes;`,
);
const scale = compiled.get('.scale') ?? new Map<string, string>();
const themeOwn: Record<Theme, Tokens> = {
  light: compiled.get('.light') ?? new Map<string, string>(),
  dark: compiled.get('.dark') ?? new Map<string, string>(),
};
const code: Record<Theme, Tokens> = {
  light: new Map([...scale, ...themeOwn.light]),
  dark: new Map([...scale, ...themeOwn.dark]),
};

/** The value of a token with every `var(--x)` of the same theme resolved. */
function resolveToken(
  tokens: Tokens,
  name: string,
  seen: readonly string[] = [],
): string | undefined {
  const value = tokens.get(name);
  if (value === undefined || seen.includes(name)) return value;
  return value.replace(
    /var\(--([\w-]+)\)/g,
    (whole, ref: string) => resolveToken(tokens, ref, [...seen, name]) ?? whole,
  );
}

/** Tokens of one category on the code side, by name. */
function codeTokens(category: Expected['category']): string[] {
  const names = new Set([...code.light.keys(), ...code.dark.keys()]);
  const inScale = (name: string): boolean => scale.has(name);
  const pick: Record<Expected['category'], (name: string) => boolean> = {
    colour: (name) => (!inScale(name) && !name.startsWith('shadow-')) || name.startsWith('reader-'),
    radius: (name) => name.startsWith('radius-'),
    type: (name) => name.startsWith('font-size-') || name.startsWith('line-height-'),
    shadow: (name) => !inScale(name) && name.startsWith('shadow-'),
    spacing: (name) => /^space-\d+$/.test(name),
  };
  return [...names].filter(pick[category]);
}

// ---------------------------------------------------------------- normalising

const round = (n: number, digits = 3): string => String(Number(n.toFixed(digits)));

function canonicalColour(r: number, g: number, b: number, a: number): string {
  if (a >= 1) {
    return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
  }
  return `rgba(${[r, g, b].map((c) => Math.round(c)).join(',')},${round(a)})`;
}

function alphaOf(raw: string | undefined): number {
  if (raw === undefined) return 1;
  return raw.endsWith('%') ? parseFloat(raw) / 100 : parseFloat(raw);
}

/** Lower case, one space, canonical colours, numbers without leading dots, px in rem. */
export function normaliseToken(value: string, { pxToRem }: { pxToRem: boolean }): string {
  let out = value.trim().toLowerCase().replace(/\s+/g, ' ');
  out = out.replace(/#([0-9a-f]{3,8})\b/g, (_, hex: string) => {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
    const a = full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1;
    return canonicalColour(r, g, b, a);
  });
  out = out.replace(/rgba?\(([^)]+)\)/g, (_, args: string) => {
    const parts = args.split(/[\s,/]+/).filter(Boolean);
    const [r, g, b] = parts.slice(0, 3).map(Number);
    return canonicalColour(r, g, b, alphaOf(parts[3]));
  });
  out = out.replace(/(^|[\s(,])\.(\d)/g, '$10.$2');
  if (pxToRem) {
    out = out.replace(/(-?\d*\.?\d+)px/g, (_, n: string) => `${round(parseFloat(n) / 16, 4)}rem`);
  }
  return out.replace(/(\d*\.\d+?)0+(?=[a-z%]|\b)/g, '$1').replace(/\.(?=[a-z%]|\s|$)/g, '');
}

const normalise = (category: Expected['category'], value: string): string =>
  normaliseToken(value, { pxToRem: category !== 'shadow' });

// ---------------------------------------------------------------- specs

describe('DS guard: token sync with tokens.json (ADR 0063)', () => {
  it('reads the Shelf tokens and the compiled libs/ui tokens', () => {
    expect(expected.length).toBeGreaterThan(80);
    expect(code.light.size).toBeGreaterThan(80);
  });

  it('normalises colour and length formats', () => {
    expect(normaliseToken('#FFF', { pxToRem: false })).toBe('#ffffff');
    expect(normaliseToken('rgba(0,0,0,0.4)', { pxToRem: false })).toBe(
      normaliseToken('rgb(0 0 0 / 40%)', { pxToRem: false }),
    );
    expect(normaliseToken('.875rem', { pxToRem: true })).toBe('0.875rem');
    expect(normaliseToken('16px', { pxToRem: true })).toBe(
      normaliseToken('1rem', { pxToRem: true }),
    );
    expect(normaliseToken('0 8px 24px rgba(0,0,0,0.14)', { pxToRem: false })).toBe(
      normaliseToken('0 8px 24px rgb(0 0 0 / 14%)', { pxToRem: false }),
    );
  });

  it('carries every Shelf value in both themes', () => {
    const diff: string[] = [];
    for (const token of expected) {
      for (const theme of THEMES) {
        const actual = resolveToken(code[theme], token.code);
        const want = normalise(token.category, token.value[theme]);
        const got = actual === undefined ? 'missing' : normalise(token.category, actual);
        if (got !== want) {
          diff.push(
            `${token.category} ${token.design} (--${token.code}) ${theme}: expected ${want}, actual ${got}`,
          );
        }
      }
    }
    expect(diff, 'token, theme, expected, actual').toEqual([]);
  });

  it('carries the Settings accent variants in the Custom theme', () => {
    const diff: string[] = [];
    for (const token of design.color.tokens.filter((t) => isAccentVariant(t.name))) {
      const match = ACCENT_VARIANT.exec(token.name)?.groups ?? {};
      for (const theme of THEMES) {
        const rule = compiled.get(
          `[${THEME_ATTRIBUTE}=${THEME_CUSTOM}][${CUSTOM_THEME_ATTRIBUTE.Base}=${theme}][${CUSTOM_THEME_ATTRIBUTE.Accent}=${match['variant']}]`,
        );
        const actual = rule?.get(match['bg'] ? 'accent-bg' : 'accent');
        const want = normalise('colour', themed(token.value)[theme]);
        const got = actual === undefined ? 'missing' : normalise('colour', actual);
        if (got !== want)
          diff.push(`colour ${token.name} ${theme}: expected ${want}, actual ${got}`);
      }
    }
    expect(diff, 'token, theme, expected, actual').toEqual([]);
  });

  it('has no token on the code side only, unless it is listed with a reason', () => {
    const known = new Set(expected.map((token) => token.code));
    const categories: readonly Expected['category'][] = [
      'colour',
      'radius',
      'type',
      'shadow',
      'spacing',
    ];
    const unlisted = categories
      .flatMap((category) => codeTokens(category))
      .filter((name) => !known.has(name) && !(name in CODE_ONLY_TOKENS));
    expect(unlisted, 'add these to tokens.json, or to CODE_ONLY_TOKENS with a reason').toEqual([]);
  });

  it('lists no stale code-only token and gives each a reason', () => {
    const known = new Set(expected.map((token) => token.code));
    for (const [name, reason] of Object.entries(CODE_ONLY_TOKENS)) {
      expect(code.light.has(name) || code.dark.has(name), `--${name} no longer exists`).toBe(true);
      expect(known.has(name), `--${name} is in tokens.json now`).toBe(false);
      expect(reason.length, `--${name} needs a reason`).toBeGreaterThan(10);
    }
  });

  it.each(THEMES)('keeps WCAG AA for the token pairs in %s', (theme) => {
    const failures = CONTRAST_PAIRS.flatMap((pair) => {
      const fg = normalise('colour', resolveToken(code[theme], pair.fg) ?? '');
      const bg = normalise('colour', resolveToken(code[theme], pair.bg) ?? '');
      const ratio = contrastRatio(fg, bg);
      return ratio >= pair.min
        ? []
        : [`${pair.fg} on ${pair.bg}: ${ratio.toFixed(2)}:1 < ${pair.min}:1`];
    });
    expect(failures).toEqual([]);
  });
});
