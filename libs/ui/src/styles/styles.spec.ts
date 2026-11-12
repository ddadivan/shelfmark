import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { compile, compileString } from 'sass';
import { PHONE_MEDIA_QUERY } from '../lib/media';
import { encapsulateStyle } from '@angular/compiler';
import { MOTION_ATTRIBUTE, MOTION_REDUCED } from '../lib/motion';
import {
  CUSTOM_THEME_ATTRIBUTE,
  LAYOUT_ATTRIBUTE,
  LAYOUT_OFF,
  THEME,
  THEME_ATTRIBUTE,
  THEME_CUSTOM,
} from '../lib/theme';

const STYLES_PATH = 'libs/ui/src/styles';

/**
 * Finds the styles folder. `import.meta.dirname` is the source folder when the spec is not
 * bundled; otherwise Nx runs the target from the workspace root, so walk up from the cwd.
 */
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

/** Compiles a Sass snippet against the public API (`@use 'ui' as *;`). */
function css(snippet: string): string {
  return compileString(`@use 'ui' as *;\n${snippet}`, { loadPaths: [STYLES_DIR] }).css;
}

/** Returns the body of every `@media (prefers-reduced-motion: reduce)` block, brace-matched. */
function reducedMotionBlock(output: string): string {
  const opener = /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{/g;
  const bodies: string[] = [];
  for (let m = opener.exec(output); m; m = opener.exec(output)) {
    let depth = 1;
    let i = opener.lastIndex;
    for (; i < output.length && depth > 0; i++) {
      depth += output[i] === '{' ? 1 : output[i] === '}' ? -1 : 0;
    }
    bodies.push(output.slice(opener.lastIndex, i - 1));
  }
  return bodies.join('\n');
}

describe('breakpoint mixins', () => {
  it('cover phone, tablet and desktop with no gap and no overlap, in em only', () => {
    const out = css(
      '.a { @include phone { x: 1; } @include tablet { x: 2; } @include desktop { x: 3; } }',
    );
    expect(out).toContain('@media (width < 40em)');
    expect(out).toContain('@media (40em <= width < 64em)');
    expect(out).toContain('@media (width >= 64em)');
    expect(out).not.toMatch(/\d+px/);
  });

  it('PHONE_MEDIA_QUERY equals the query the phone mixin compiles to', () => {
    expect(css('.a { @include phone { x: 1; } }')).toContain(`@media ${PHONE_MEDIA_QUERY}`);
  });

  it('tablet-up starts exactly where phone ends', () => {
    expect(css('.a { @include tablet-up { x: 1; } }')).toContain('@media (width >= 40em)');
  });
});

describe('focus mixins', () => {
  it('field-focus removes the global ring only from controls inside the wrapper', () => {
    const out = css('.a { @include field-focus; }');
    expect(out).toMatch(
      /\.a :where\(input, textarea, \[contenteditable\]\):focus-visible \{\s*outline: none;/,
    );
    expect(css('.a { @include focus-ring; }')).not.toContain('outline: none');
  });

  it('focus-ring draws a 2px focus-ring outline with a 2px offset', () => {
    const out = css('.a { @include focus-ring; }');
    expect(out).toContain('outline: 2px solid var(--focus-ring)');
    expect(out).toContain('outline-offset: 2px');
  });

  it('field-focus turns the border focus-ring with a 3px halo over the fast duration', () => {
    const out = css('.a { @include field-focus; }');
    expect(out).toContain('.a:focus-within');
    expect(out).toContain('border-color: var(--focus-ring)');
    expect(out).toContain('0 0 0 3px color-mix(in srgb, var(--focus-ring) 22%, transparent)');
    expect(out).toContain('var(--duration-fast)');
  });
});

describe('utility mixins', () => {
  it('visually-hidden keeps the element out of sight but present', () => {
    const out = css('.a { @include visually-hidden; }');
    expect(out).toContain('position: absolute');
    expect(out).toContain('clip-path: inset(50%)');
  });

  it('line-clamp clamps to the requested number of lines', () => {
    expect(css('.a { @include line-clamp(2); }')).toContain('-webkit-line-clamp: 2');
    expect(css('.a { @include line-clamp(1); }')).toContain('line-clamp: 1');
  });

  it('coarse wraps its content in a pointer: coarse query', () => {
    const out = css('.a { @include coarse { x: 1; } }');
    expect(out).toContain('@media (pointer: coarse)');
  });

  it('hit-area adds an invisible rem-based ::after, with an optional coarse inset', () => {
    const plain = css('.a { @include hit-area(-6px -4px); }');
    expect(plain).toContain('position: relative');
    expect(plain).toContain('inset: -0.375rem -0.25rem');
    expect(plain).toContain('content: ""');
    expect(plain).not.toContain('@media');
    expect(plain).not.toMatch(/\d+px/);

    const coarse = css('.a { @include hit-area(-6px, -10px); }');
    expect(coarse).toContain('inset: -0.375rem');
    expect(coarse).toMatch(/@media \(pointer: coarse\)[\s\S]*inset: -0\.625rem/);
  });

  it('touch-target sets a 44px minimum on coarse pointers only', () => {
    const out = css('.a { @include touch-target; }');
    expect(out).toMatch(/@media \(pointer: coarse\)[\s\S]*min-width: 2\.75rem/);
    expect(out).toContain('min-height: 2.75rem');
    expect(css('.a { @include touch-target(48px); }')).toContain('min-width: 3rem');
  });

  it('rem-list converts every value and keeps 0', () => {
    expect(css('.a { x: rem-list(-6px 0 -16px); }')).toContain('x: -0.375rem 0 -1rem');
  });
});

describe('motion mixins', () => {
  it.each([
    ['enter(pop)', 'ui-pop-in var(--duration-base) var(--ease-out) both'],
    ['enter(fade)', 'ui-reveal var(--duration-base) var(--ease-out) both'],
    ['enter(toast)', 'ui-toast-in var(--duration-slow) var(--ease-spring) both'],
    ['enter(sheet)', 'ui-sheet-in var(--duration-slow) var(--ease-drawer) both'],
    ['enter(drawer)', 'ui-drawer-in var(--duration-slow) var(--ease-drawer) both'],
    ['leave(drawer)', 'ui-drawer-out var(--duration-base) var(--ease-in) both'],
    ['leave(pop)', 'ui-pop-out var(--duration-fast) var(--ease-out) both'],
    ['leave(toast)', 'ui-toast-out var(--duration-fast) var(--ease-in) both'],
    ['leave(sheet)', 'ui-sheet-out var(--duration-base) var(--ease-in) both'],
  ])('%s uses tokens for duration and easing', (include, animation) => {
    expect(css(`.a { @include ${include}; }`)).toContain(`animation: ${animation}`);
  });

  it.each([
    'enter(pop)',
    'enter(toast)',
    'enter(sheet)',
    'enter(drawer)',
    'enter(spinner)',
    'enter(spinner-grow)',
  ])('%s falls back to a fade in 200 ms under reduced motion', (include) => {
    const reduced = reducedMotionBlock(css(`.a { @include ${include}; }`));
    expect(reduced).toContain('animation: ui-reveal var(--duration-base) var(--ease-out) both');
    expect(reduced).not.toMatch(/ui-(pop-in|toast-in|sheet-in|drawer-in|spinner-grow)/);
  });

  it.each(['leave(pop)', 'leave(toast)', 'leave(sheet)', 'leave(drawer)', 'leave(spinner-shrink)'])(
    '%s falls back to a plain fade-out under reduced motion',
    (include) => {
      const reduced = reducedMotionBlock(css(`.a { @include ${include}; }`));
      expect(reduced).toContain('ui-fade-out');
      expect(reduced).not.toMatch(/ui-(pop-out|toast-out|sheet-out|drawer-out|spinner-shrink)/);
    },
  );

  it('presets are finite so animate.leave can finish: no infinite, no loader rotation', () => {
    const presets = ['pop', 'fade', 'toast', 'sheet', 'drawer', 'spinner', 'spinner-grow']
      .map((n) => `.a { @include enter(${n}); }`)
      .concat(
        ['pop', 'fade', 'toast', 'sheet', 'drawer', 'spinner', 'spinner-shrink'].map(
          (n) => `.a { @include leave(${n}); }`,
        ),
      )
      .map(css)
      .join('\n');
    expect(presets).not.toContain('infinite');
    expect(presets).not.toMatch(/ui-spin(?![\w-])/);
  });

  it('loops keep moving slower for loaders and stop for the shimmer', () => {
    expect(reducedMotionBlock(css('.a { @include loop(spin); }'))).toContain(
      'animation-duration: 1.6s',
    );
    expect(reducedMotionBlock(css('.a { @include loop(progress); }'))).toContain(
      'ui-progress 2.4s linear infinite',
    );
    expect(reducedMotionBlock(css('.a { @include loop(shimmer); }'))).toContain('animation: none');
  });

  it('only the loaders use linear', () => {
    const nonLoaders = css(
      '.a { @include enter(pop); @include leave(sheet); @include enter(toast); }',
    );
    expect(nonLoaders).not.toContain('linear');
  });

  it('origin falls back to the given value and honours --ui-origin', () => {
    expect(css('.a { @include origin; }')).toContain(
      'transform-origin: var(--ui-origin, top left)',
    );
    expect(css('.a { @include origin(center); }')).toContain('var(--ui-origin, center)');
  });

  it('rejects unknown presets', () => {
    expect(() => css('.a { @include enter(nope); }')).toThrow(/Unknown enter preset/);
    expect(() => css('.a { @include leave(nope); }')).toThrow(/Unknown leave preset/);
    expect(() => css('.a { @include loop(nope); }')).toThrow(/Unknown loop/);
  });

  it('defines every shared keyframe once, with the ui- prefix', () => {
    const out = css('@include keyframes;');
    const names = [...out.matchAll(/@keyframes (\S+)/g)].map((m) => m[1]);
    expect(names).toEqual([
      'ui-pop-in',
      'ui-pop-out',
      'ui-fade-out',
      'ui-reveal',
      'ui-sheet-in',
      'ui-sheet-out',
      'ui-drawer-in',
      'ui-drawer-out',
      'ui-toast-in',
      'ui-toast-out',
      'ui-toast-count',
      'ui-spin',
      'ui-spinner-in',
      'ui-spinner-grow',
      'ui-spinner-out',
      'ui-spinner-shrink',
      'ui-shimmer',
      'ui-progress',
      'ui-ripple-grow',
      'ui-ripple-fade',
      'ui-land',
      'ui-land-ring',
    ]);
    expect(out).not.toMatch(/\d+px/);
  });

  it('landed drops the card in with the spring and fades the sage ring, staggered by --ui-land-delay', () => {
    const out = css('.a { @include landed; }');
    expect(out).toContain(
      'ui-land var(--duration-slow) var(--ease-spring) var(--ui-land-delay, 0s) both',
    );
    expect(out).toContain('ui-land-ring 1.8s var(--ease-out) var(--ui-land-delay, 0s) both');
    expect(out).not.toContain('infinite');
  });

  it('landed keeps only a fade and the ring under reduced motion', () => {
    const reduced = reducedMotionBlock(css('.a { @include landed; }'));
    expect(reduced).toContain('ui-reveal var(--duration-base)');
    expect(reduced).toContain('ui-land-ring');
    expect(reduced).not.toMatch(/(^|[\s,])ui-land\s/);
  });
});

describe('overlay mixins', () => {
  it('popover is the floating surface: surface, border, radius-md and shadow-popover', () => {
    const output = css('.p { @include popover; }');
    expect(output).toContain('background: var(--surface)');
    expect(output).toContain('border: 1px solid var(--border)');
    expect(output).toContain('border-radius: var(--radius-md)');
    expect(output).toContain('box-shadow: var(--shadow-popover)');
  });

  it('layers stack dialog < menu < toast < tooltip', () => {
    const output = css('@include overlay-layers;');
    const z = (name: string) =>
      Number(
        new RegExp(`ui-overlay-layer--${name}\\s*\\{\\s*z-index:\\s*(\\d+)`).exec(output)?.[1],
      );
    expect(z('dialog')).toBeLessThan(z('menu'));
    expect(z('menu')).toBeLessThan(z('toast'));
    expect(z('toast')).toBeLessThan(z('tooltip'));
  });

  it('passthrough panes out-rank the CDK pane rule (two classes, pointer-events none)', () => {
    const output = css('@include overlay-passthrough;');
    expect(output).toMatch(
      /\.cdk-overlay-pane\.ui-overlay-pane--passthrough\s*\{\s*pointer-events:\s*none/,
    );
  });
});

/** Reads a hex custom property from the `@mixin light` / `@mixin dark` output. */
function tokenHex(theme: 'light' | 'dark', name: string): string {
  const out = css(`:root { @include ${theme}; }`);
  const match = new RegExp(`--${name}:\\s*(#[0-9a-f]{3,6})`).exec(out);
  if (!match) {
    throw new Error(`token --${name} not found in ${theme}`);
  }
  return match[1];
}

function luminance(hex: string): number {
  const full = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join('')}` : hex;
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('glass mixin', () => {
  it('uses the glass tokens and shadow-float, blur only where supported, none under reduced motion', () => {
    const out = css('.g { @include glass; }');
    expect(out).toContain('background: var(--glass)');
    expect(out).toContain('border: 1px solid var(--glass-line)');
    expect(out).toContain('box-shadow: var(--shadow-float)');
    expect(out).toMatch(/@supports \(backdrop-filter: blur\(1px\)\)/);
    expect(out).toContain('backdrop-filter: blur(1.5rem) saturate(1.5)');
    expect(reducedMotionBlock(out)).toContain('backdrop-filter: none');
  });

  it('glass-utility defines the global .ui-glass class', () => {
    expect(css('@include glass-utility;')).toMatch(/\.ui-glass \{[^}]*var\(--glass\)/);
  });
});

const FOLDER_COLOURS = ['graphite', 'sage', 'ocean', 'plum', 'clay', 'amber', 'rose', 'teal'];

describe('folder colour contrast (WCAG AA 4.5:1)', () => {
  it.each(['light', 'dark'] as const)('every glyph holds on its tile in %s', (theme) => {
    for (const colour of FOLDER_COLOURS) {
      const ratio = contrast(
        tokenHex(theme, `folder-${colour}`),
        tokenHex(theme, `folder-${colour}-bg`),
      );
      expect(ratio, `${theme} ${colour}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

/** The hex behind `--illustration-disc`, an alias of another colour token. */
function discHex(theme: 'light' | 'dark'): string {
  const out = css(`:root { @include ${theme}; }`);
  const alias = /--illustration-disc:\s*var\(--([a-z-]+)\)/.exec(out);
  if (!alias) {
    throw new Error(`token --illustration-disc is not an alias in ${theme}`);
  }
  return tokenHex(theme, alias[1]);
}

describe('empty-state scene disc (#315, WCAG 1.4.11 3:1)', () => {
  it('is a step stronger than the page in light, the page itself in dark', () => {
    expect(discHex('light')).toBe(tokenHex('light', 'surface-hover'));
    expect(discHex('dark')).toBe(tokenHex('dark', 'bg'));
  });

  it.each(['light', 'dark'] as const)(
    'keeps the scene edges and accent shapes at 3:1 on the disc in %s',
    (theme) => {
      for (const edge of ['border-control', 'accent', 'primary']) {
        const ratio = contrast(tokenHex(theme, edge), discHex(theme));
        expect(ratio, `${theme} ${edge}`).toBeGreaterThanOrEqual(3);
      }
    },
  );
});

describe('text-muted contrast (WCAG AA 4.5:1)', () => {
  it.each(['light', 'dark'] as const)('holds on every surface in %s', (theme) => {
    expect(tokenHex(theme, 'text-muted')).toBe(theme === 'light' ? '#636368' : '#9a9aa0');
    for (const surface of ['bg', 'surface', 'surface-hover', 'surface-pressed', 'accent-bg']) {
      const ratio = contrast(tokenHex(theme, 'text-muted'), tokenHex(theme, surface));
      expect(ratio, `${theme} ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('highlight mark contrast (WCAG AA 4.5:1)', () => {
  it.each(['light', 'dark'] as const)('highlight-text on highlight-bg holds in %s', (theme) => {
    const ratio = contrast(tokenHex(theme, 'highlight-text'), tokenHex(theme, 'highlight-bg'));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    // Documented in libs/ui/CLAUDE.md and BRAND.md (light 9.4:1, dark 6.9:1).
    expect(ratio).toBeGreaterThan(theme === 'light' ? 9 : 6.5);
  });

  it.each(['light', 'dark'] as const)(
    'the mark stands out from the row backgrounds in %s',
    (theme) => {
      for (const row of ['surface', 'surface-hover', 'accent-bg']) {
        expect(tokenHex(theme, 'highlight-bg'), `${theme} ${row}`).not.toBe(tokenHex(theme, row));
      }
    },
  );
});

describe('themes', () => {
  it('global.scss defines a [data-theme] selector for every THEME value', () => {
    const output = compile(resolve(STYLES_DIR, 'global.scss'), {
      loadPaths: [resolve(STYLES_DIR, '../../../../node_modules')],
    }).css;
    for (const theme of Object.values(THEME)) {
      expect(output).toContain(`[${THEME_ATTRIBUTE}=${theme}]`);
    }
  });

  it('global.scss defines the Custom theme rules on the attributes ThemeService sets', () => {
    const output = compile(resolve(STYLES_DIR, 'global.scss'), {
      loadPaths: [resolve(STYLES_DIR, '../../../../node_modules')],
    }).css;
    const custom = `[${THEME_ATTRIBUTE}=${THEME_CUSTOM}]`;
    expect(output).toContain(`${custom}[${CUSTOM_THEME_ATTRIBUTE.Base}=dark]`);
    expect(output).toContain(
      `${custom}[${CUSTOM_THEME_ATTRIBUTE.Base}=light][${CUSTOM_THEME_ATTRIBUTE.Accent}=ocean]`,
    );
    expect(output).toContain(
      `${custom}[${CUSTOM_THEME_ATTRIBUTE.Base}=dark][${CUSTOM_THEME_ATTRIBUTE.Background}=ink]`,
    );
    expect(output).toContain(`${custom}[${CUSTOM_THEME_ATTRIBUTE.Corners}=square]`);
  });
});

describe('reduced-motion mixin and the Animations setting', () => {
  const reduced = `[${MOTION_ATTRIBUTE}=${MOTION_REDUCED}]`;

  it('applies under the media query and under html[data-motion=reduced], in global and component styles', () => {
    const out = css('.a { transition: x; @include reduced-motion { transition: none; } }');
    expect(reducedMotionBlock(out)).toContain('transition: none');
    expect(out).toMatch(
      new RegExp(`:root\\[${MOTION_ATTRIBUTE}=${MOTION_REDUCED}\\] \\.a \\{\\s*transition: none;`),
    );
    expect(out).toContain(`:host-context(${reduced}) .a {`);
  });

  it('works at the top level of a stylesheet', () => {
    const out = css('@include reduced-motion { .b { animation: none; } }');
    expect(out).toContain(`:root${reduced} .b`);
    expect(out).toContain(`:host-context(${reduced}) .b`);
  });

  it('survives Angular emulated encapsulation for plain, :host and nested selectors', () => {
    const out = encapsulateStyle(
      css(
        ':host { @include reduced-motion { a: 1; } } .c { @include reduced-motion { &:active { b: 2; } } } @include reduced-motion { :host, .d { c: 3; } }',
      ),
      'c0',
    );
    expect(out).toContain(`${reduced}   [_nghost-c0]`);
    expect(out).toMatch(
      new RegExp(
        `\\[${MOTION_ATTRIBUTE}=${MOTION_REDUCED}\\]\\s+\\[_nghost-c0\\]\\s+\\.c\\[_ngcontent-c0\\]:active`,
      ),
    );
    expect(out).toMatch(new RegExp(`\\.d\\[_ngcontent-c0\\]`));
    expect(out).not.toContain(':host');
  });
});

describe('appearance layout attributes (#285)', () => {
  const globalCss = (): string =>
    compile(resolve(STYLES_DIR, 'global.scss'), {
      loadPaths: [resolve(STYLES_DIR, '../../../../node_modules')],
    }).css;

  /** The declarations of the first rule whose selector is exactly `selector`. */
  function rule(output: string, selector: string): string {
    const at = output.indexOf(`${selector} {`);
    expect(at, `no rule for ${selector}`).toBeGreaterThanOrEqual(0);
    const open = output.indexOf('{', at);
    return output.slice(open + 1, output.indexOf('}', open));
  }

  it('scales the root font size for every text size but the default', () => {
    const out = globalCss();
    const size = (value: string) => rule(out, `:root[${LAYOUT_ATTRIBUTE.TextSize}=${value}]`);
    expect(size('s')).toContain('font-size: 90%');
    expect(size('l')).toContain('font-size: 112.5%');
    expect(size('xl')).toContain('font-size: 125%');
    expect(out).not.toContain(`[${LAYOUT_ATTRIBUTE.TextSize}=m]`);
  });

  it('swaps --font-sans for the system and the readable font', () => {
    const out = globalCss();
    expect(rule(out, `[${LAYOUT_ATTRIBUTE.Font}=system]`)).toContain('--font-sans: system-ui');
    expect(rule(out, `[${LAYOUT_ATTRIBUTE.Font}=readable]`)).toContain(
      "--font-sans: 'Atkinson Hyperlegible'",
    );
  });

  it('has comfortable density tokens on :root and tighter ones under compact', () => {
    const out = globalCss();
    const root = out.slice(out.indexOf(':root {'));
    for (const token of ['card-padding', 'card-gap', 'feed-gap', 'row-padding']) {
      expect(root).toContain(`--density-${token}:`);
      expect(rule(out, `[${LAYOUT_ATTRIBUTE.Density}=compact]`)).toContain(`--density-${token}:`);
    }
    expect(rule(out, `[${LAYOUT_ATTRIBUTE.Density}=compact]`)).toContain(
      '--density-feed-gap: var(--space-2)',
    );
  });

  it('lets ui-card shrink or drop its image area on the preview attribute', () => {
    const card = compile(resolve(STYLES_DIR, '../lib/card/card.component.scss'), {
      loadPaths: [STYLES_DIR],
    }).css;
    expect(card).toMatch(
      /:host-context\(\[data-card-preview=small\]\) \.ui-card__media \{\s*aspect-ratio: 32 ?\/ ?9;/,
    );
    expect(card).toMatch(
      /:host-context\(\[data-card-preview=off\]\) \.ui-card__media \{\s*display: none;/,
    );
    expect(card).toContain('padding: var(--density-card-padding)');
    const preview = compile(
      resolve(STYLES_DIR, '../lib/theme-preview/theme-preview.component.scss'),
      {
        loadPaths: [STYLES_DIR],
      },
    ).css;
    for (const [attribute, part] of [
      [LAYOUT_ATTRIBUTE.CardSite, 'site'],
      [LAYOUT_ATTRIBUTE.CardNotes, 'note'],
      [LAYOUT_ATTRIBUTE.CardTags, 'tag'],
    ] as const) {
      expect(preview).toContain(
        `:host-context([${attribute}=${LAYOUT_OFF}]) .ui-theme-preview__${part}`,
      );
    }
  });
});
