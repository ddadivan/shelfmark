import { Logger, compileString } from 'sass';

// DS guard, rendered check (ADR 0062): every value a story paints must be a libs/ui token of the
// active theme. Node compiles the token names from the Sass sources; the page resolves each one
// under the story's theme (a probe element inside #storybook-root) and then walks the visible
// elements, reading the computed colour, background colour, border colours (sides wider than 0),
// font size and corner radii.
//
// Skipped: svg, img, video, canvas and everything inside them, and any subtree marked
// `data-ds-ignore` (illustrations of other people's UI, colour swatches the person picked,
// third-party previews). Text colour and font size are read only on elements with their own text,
// so an inherited value is reported once, where it shows.

const STYLES_DIR = new URL('../src/styles/', import.meta.url).pathname;

/** Token names per checked category (without `--`). */
export interface DsTokenNames {
  readonly colours: readonly string[];
  readonly radii: readonly string[];
  readonly fontSizes: readonly string[];
}

const declared = (css: string, selector: string): string[] => {
  const body = new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  return [...body.matchAll(/--([\w-]+)\s*:/g)].map((m) => m[1]);
};

export function loadDsTokenNames(): DsTokenNames {
  const css = compileString(
    `@use 'ui' as *;\n.s { @include scale; }\n.l { @include light; }\n.d { @include dark; }`,
    { loadPaths: [STYLES_DIR], logger: Logger.silent },
  ).css;
  const scale = declared(css, '.s');
  const themed = [...new Set([...declared(css, '.l'), ...declared(css, '.d')])];
  return {
    colours: [
      ...themed.filter((name) => !name.startsWith('shadow-') && name !== 'wave-opacity'),
      ...scale.filter((name) => name.startsWith('reader-')),
    ],
    radii: scale.filter((name) => name.startsWith('radius-')),
    fontSizes: scale.filter((name) => name.startsWith('font-size-')),
  };
}

/**
 * Browser script (a string: this project has no DOM lib) that returns the off-token values of
 * the visible elements under `rootSelector`, one line each: `property value  at  element`.
 */
export function dsCheckScript(names: DsTokenNames, rootSelector: string): string {
  return `(() => {
    const names = ${JSON.stringify(names)};
    const root = document.querySelector(${JSON.stringify(rootSelector)});
    if (!root) return ['no ' + ${JSON.stringify(rootSelector)}];
    const ctx = document.createElement('canvas').getContext('2d');
    const colour = (value) => { ctx.fillStyle = '#000'; ctx.fillStyle = value; return String(ctx.fillStyle); };
    // A subtree with its own theme attributes (theme pickers, the Reader) has its own token
    // values: the allowed sets are resolved once per theme host, with a probe inside it.
    const THEMED = '[data-theme], [data-custom-accent], [data-custom-background], [data-custom-corners], [data-reader-theme]';
    const cache = new Map();
    const allowed = (el) => {
      const inner = el.closest(THEMED);
      const host = inner && root.contains(inner) ? inner : root;
      if (cache.has(host)) return cache.get(host);
      const probe = document.createElement('div');
      probe.setAttribute('data-ds-probe', '');
      host.appendChild(probe);
      const resolve = (property, name) => {
        probe.style.setProperty(property, 'var(--' + name + ')');
        const value = getComputedStyle(probe).getPropertyValue(property);
        probe.style.removeProperty(property);
        return value;
      };
      const sets = {
        colours: new Set(['rgba(0, 0, 0, 0)', ...names.colours.map((n) => colour(resolve('color', n)))]),
        radii: new Set(['0px', '50%', ...names.radii.map((n) => resolve('border-top-left-radius', n))]),
        sizes: new Set(names.fontSizes.map((n) => resolve('font-size', n))),
      };
      probe.remove();
      cache.set(host, sets);
      return sets;
    };

    // Colours that come from data, not from the design: a site's brand colour on its favicon, an
    // own folder colour, the colour picker's colour space and swatches of picked colours.
    const DATA_COLOURS = '.ui-favicon--coloured, .ui-folder-icon--own, [data-ui-folder-colour], .ui-color-picker__area, .ui-color-picker__paint, .ui-color-picker__preview, .ui-color-picker__handle, .ui-color-picker__hidden-slider, .ui-choice__swatch';
    // Sizes the person sets: the Reader's text size setting and the logo's size input.
    const FREE_SIZES = 'ui-reader, ui-logo';
    const skipped = (el) => el.closest('svg, img, video, canvas, [data-ds-ignore]') !== null;
    const label = (el) => {
      const cls = [...el.classList].slice(0, 2).join('.');
      return el.tagName.toLowerCase() + (cls ? '.' + cls : '');
    };
    const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    // The documented scale inputs (#352) multiply sizes on purpose: a scaled subtree keeps its
    // colours checked, not its sizes.
    const SCALES = ['--ui-button-scale', '--ui-chip-scale', '--ui-favicon-scale', '--ui-icon-scale'];
    const scaled = (s) => SCALES.some((p) => { const v = s.getPropertyValue(p).trim(); return v !== '' && Number(v) !== 1; });
    const found = new Set();
    const elements = [...root.querySelectorAll('*')];
    for (const el of elements) {
      if (skipped(el)) continue;
      const box = el.getBoundingClientRect();
      // Nothing painted, or visually hidden text (1 x 1 px, clipped).
      if (box.width <= 1 || box.height <= 1) continue;
      // An endless animation (shimmer, loaders) paints mixes on purpose; finite ones have ended.
      if (el.getAnimations().some((a) => a.playState === 'running')) continue;
      const dataColour = el.closest(DATA_COLOURS) !== null;
      const freeSize = el.closest(FREE_SIZES) !== null;
      if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const s = getComputedStyle(el);
      const { colours, radii, sizes } = allowed(el);
      const report = (property, value) => found.add(property + ' ' + value + '  at  ' + label(el));
      if (ownText(el)) {
        const c = colour(s.color);
        if (!dataColour && !colours.has(c)) report('color', c);
        if (!freeSize && !scaled(s) && !sizes.has(s.fontSize)) report('font-size', s.fontSize);
      }
      const bg = colour(s.backgroundColor);
      if (!dataColour && !colours.has(bg)) report('background-color', bg);
      for (const side of ['top', 'right', 'bottom', 'left']) {
        if (parseFloat(s.getPropertyValue('border-' + side + '-width')) > 0 && s.getPropertyValue('border-' + side + '-style') !== 'none') {
          const c = colour(s.getPropertyValue('border-' + side + '-color'));
          if (!dataColour && !colours.has(c)) report('border-' + side + '-color', c);
        }
      }
      for (const corner of ['top-left', 'top-right', 'bottom-right', 'bottom-left']) {
        const r = s.getPropertyValue('border-' + corner + '-radius');
        if (!scaled(s) && !r.split(' ').every((part) => radii.has(part))) report('border-' + corner + '-radius', r);
      }
    }
    return [...found].sort();
  })()`;
}
