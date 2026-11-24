// Shelf design-system guard (ADR 0062): radii, font sizes and shadows come from the libs/ui tokens.
// Colours are guarded by core rules in stylelint.config.mjs (color-no-hex, color-named,
// function-disallowed-list); these three rules cover what core rules cannot express.
//
// Each rule splits a value at top-level commas and spaces (postcss-value-parser), so
// `color-mix(in srgb, …)` inside a shadow stays one part. An exception is a
// `/* stylelint-disable-next-line shelf/… -- reason */` comment (reportDescriptionlessDisables).
import valueParser from 'postcss-value-parser';
import stylelint from 'stylelint';

const {
  createPlugin,
  utils: { report, ruleMessages, validateOptions },
} = stylelint;

const RADIUS_TOKEN = /^var\(--radius-[a-z0-9-]+\)$/;
// The name may carry a Sass interpolation (the `type()` mixin: `var(--font-size-#{$token})`).
const FONT_SIZE_TOKEN = /^var\(--font-size-([a-z0-9-]|#\{\$[a-z-]+\})+\)$/;
const SHADOW_TOKEN = /^var\(--shadow-[a-z0-9-]+\)$/;
const FOCUS_RING = /var\(--focus-ring\)/;
const GLOBAL_KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);

/** Top-level parts of a value: split at commas (`groups`) and then at spaces (`words`). */
function groups(value) {
  const result = [[]];
  // A Sass `#{rem(2px)}` is one length: read it as its px value so it stays one part.
  const plain = value.replace(/#\{rem\((-?[\d.]+px)\)\}/g, '$1');
  for (const node of valueParser(plain).nodes) {
    if (node.type === 'div' && node.value === ',') {
      result.push([]);
    } else if (node.type !== 'space' && node.type !== 'comment') {
      result.at(-1).push(valueParser.stringify(node));
    }
  }
  return result.filter((group) => group.length > 0);
}

function isKeyword(value) {
  return GLOBAL_KEYWORDS.has(value.trim().toLowerCase());
}

function definePlugin(name, { message, properties, check }) {
  const ruleName = `shelf/${name}`;
  const messages = ruleMessages(ruleName, { rejected: message });
  const rule = (enabled) => (root, result) => {
    if (!validateOptions(result, ruleName, { actual: enabled, possible: [true] }) || !enabled) {
      return;
    }
    root.walkDecls((decl) => {
      if (!properties.test(decl.prop.toLowerCase())) return;
      const value = decl.value.trim();
      if (isKeyword(value) || check(value)) return;
      report({
        ruleName,
        result,
        node: decl,
        word: decl.value,
        message: messages.rejected(decl.prop, value),
      });
    });
  };
  rule.ruleName = ruleName;
  rule.messages = messages;
  return createPlugin(ruleName, rule);
}

/**
 * One corner value: `var(--radius-*)`, `0`, `50%`, or a component hook `var(--ui-…-radius)` whose
 * fallback (if any) is itself an allowed corner value.
 */
function isRadiusPart(part) {
  if (part === '/' || part === '0' || part === '50%' || RADIUS_TOKEN.test(part)) return true;
  const hook = /^var\(\s*--ui-[a-z0-9-]*radius\s*(?:,\s*(.+))?\)$/s.exec(part);
  return hook !== null && (hook[1] === undefined || isRadiusPart(hook[1].trim()));
}

/**
 * border-radius, its longhands and component radius hooks (`--ui-…-radius` custom properties):
 * `var(--radius-*)`, `0`, `50%` per corner (`/` allowed).
 */
export const radiusToken = definePlugin('radius-token', {
  properties:
    /^(border(-(top|bottom|start|end)-(left|right|start|end))?-radius|--ui-[a-z0-9-]*radius)$/,
  message: (prop, value) =>
    `Unexpected "${prop}: ${value}". Use var(--radius-*), 0 or 50% (add a radius token to tokens.json first)`,
  check: (value) => groups(value).length === 1 && groups(value)[0].every(isRadiusPart),
});

/**
 * True when a value is built from custom properties only: it holds at least one `var()` and no
 * raw length anywhere (no `14px`, `1.1rem`, `0.85em`, `100%`, `rem(…)` call or Sass
 * interpolation), not even as a `var()` fallback. Plain numbers (`calc(var(--x) * 0.55)`) are fine.
 */
function isVarsOnly(value) {
  if (value.includes('#{') || value.includes('$')) return false;
  let hasVar = false;
  let hasRaw = false;
  valueParser(value).walk((node) => {
    if (node.type === 'function' && node.value === 'var') hasVar = true;
    if (node.type === 'function' && /^rem(-list)?$/.test(node.value)) hasRaw = true;
    if (node.type === 'word' && !node.value.startsWith('--')) {
      const dimension = valueParser.unit(node.value);
      if (dimension && dimension.unit !== '') hasRaw = true;
    }
  });
  return hasVar && !hasRaw;
}

/**
 * font-size: a type-scale token, or an expression over custom properties only (a component size
 * input, the Reader size setting). font shorthand: a type-scale token for its size part.
 */
export const fontSizeToken = definePlugin('font-size-token', {
  properties: /^font(-size)?$/,
  message: (prop, value) =>
    `Unexpected "${prop}: ${value}". Use a type-scale token var(--font-size-*), the type() mixin or other var(--…) values (add a type token to tokens.json first)`,
  check: (value) =>
    groups(value)
      .flat()
      .some((part) => FONT_SIZE_TOKEN.test(part)) || isVarsOnly(value),
});

/** A shadow colour drawn from tokens: a `var()`, a `color-mix()` of them, or a keyword. */
function isTokenColour(part) {
  return /^(var|color-mix)\(/.test(part) && !part.includes('#')
    ? true
    : /^(transparent|currentcolor)$/i.test(part);
}

/** A length a shadow may use: `0`, px or rem (`#{rem(2px)}` arrives as `2px`, see `groups`). */
function isShadowLength(part) {
  return part === '0' || /^-?\d*\.?\d+(px|rem)$/.test(part);
}

/**
 * A hard-edged ring or line: `[inset] <x> <y> [0 [<spread>]] <token colour>` with no blur. That
 * is a border drawn with box-shadow (hairlines, selection rings, drop targets), not elevation;
 * every soft shadow (blur above 0) has to be a `--shadow-*` token.
 */
function isRing(group) {
  const parts = group.filter((part) => part.toLowerCase() !== 'inset');
  const colour = parts.at(-1);
  const lengths = parts.slice(0, -1);
  return (
    colour !== undefined &&
    isTokenColour(colour) &&
    lengths.length >= 2 &&
    lengths.length <= 4 &&
    lengths.every(isShadowLength) &&
    (lengths[2] === undefined || lengths[2] === '0')
  );
}

/**
 * box-shadow: `none`, `var(--shadow-*)`, a focus ring drawn with `var(--focus-ring)`, or a
 * hard-edged ring in a token colour (see `isRing`), per comma-separated layer.
 */
export const shadowToken = definePlugin('shadow-token', {
  properties: /^box-shadow$/,
  message: (prop, value) =>
    `Unexpected "${prop}: ${value}". Use var(--shadow-*), none, a focus ring with var(--focus-ring) or a hard-edged ring in a token colour (add a shadow token to tokens.json first)`,
  check: (value) =>
    value === 'none' ||
    groups(value).every(
      (group) =>
        (group.length === 1 && SHADOW_TOKEN.test(group[0])) ||
        FOCUS_RING.test(group.join(' ')) ||
        isRing(group),
    ),
});

export default [radiusToken, fontSizeToken, shadowToken];
