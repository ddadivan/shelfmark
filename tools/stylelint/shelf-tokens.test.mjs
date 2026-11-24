// Tests of the DS guard stylelint rules (ADR 0063). Run: node --test tools/stylelint/
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import stylelint from 'stylelint';
import config from '../../stylelint.config.mjs';

/** Lints one SCSS snippet as if it lived at `file` and returns the rule names it broke. */
async function lint(code, file = 'libs/ui/src/lib/components/x/x.component.scss') {
  const { results } = await stylelint.lint({
    code,
    codeFilename: file,
    config,
    configBasedir: new URL('../../', import.meta.url).pathname,
  });
  return results[0].warnings
    .map((warning) => warning.rule)
    .filter((rule) => DS_RULES.has(rule) || rule.startsWith('--'));
}

// Only the DS guard rules are under test; formatting rules of the shared config are not.
const DS_RULES = new Set([
  'color-no-hex',
  'color-named',
  'function-disallowed-list',
  'shelf/radius-token',
  'shelf/font-size-token',
  'shelf/shadow-token',
]);

const ok = async (code, file) => assert.deepEqual(await lint(code, file), [], code);
const fails = async (code, rule, file) =>
  assert.ok((await lint(code, file)).includes(rule), `${code} should break ${rule}`);

describe('colours', () => {
  it('rejects hex, colour functions and named colours outside the token files', async () => {
    await fails('a { color: #fff; }', 'color-no-hex');
    await fails('a { color: rgb(0 0 0 / 40%); }', 'function-disallowed-list');
    await fails('a { color: hsl(0 0% 0%); }', 'function-disallowed-list');
    await fails('a { color: white; }', 'color-named');
  });

  it('allows tokens, transparent, currentcolor, inherit and color-mix of tokens', async () => {
    await ok('a { color: var(--text); }');
    await ok('a { background: transparent; border-color: currentcolor; color: inherit; }');
    await ok('a { background: color-mix(in srgb, var(--ai) 24%, var(--surface)); }');
  });

  it('allows raw colours in the token files', async () => {
    await ok('a { --bg: #fff; --overlay: rgb(0 0 0 / 55%); }', 'libs/ui/src/styles/tokens/_x.scss');
  });
});

describe('shelf/radius-token', () => {
  it('allows radius tokens, 0, 50%, inherit and component hooks with token fallbacks', async () => {
    await ok('a { border-radius: var(--radius-md); }');
    await ok('a { border-radius: var(--radius-card) var(--radius-card) 0 0; }');
    await ok('a { border-radius: 50%; }');
    await ok('a { border-radius: inherit; }');
    await ok('a { border-radius: var(--ui-x-radius, var(--radius-sm)); }');
    await ok('a { --ui-x-radius: var(--radius-xs); }');
  });

  it('rejects raw radii, calc and raw fallbacks', async () => {
    await fails('a { border-radius: rem(8px); }', 'shelf/radius-token');
    await fails('a { border-radius: calc(var(--radius-md) - 2px); }', 'shelf/radius-token');
    await fails('a { border-radius: var(--ui-x-radius, 6px); }', 'shelf/radius-token');
    await fails('a { --ui-x-radius: #{rem(6px)}; }', 'shelf/radius-token');
  });
});

describe('shelf/font-size-token', () => {
  it('allows type tokens, var-only expressions and the mixin', async () => {
    await ok('a { font-size: var(--font-size-label); }');
    await ok('a { font-size: calc(var(--font-size-meta) * var(--ui-chip-scale, 1)); }');
    await ok('a { font-size: var(--ui-reader-size); }');
    await ok('a { font: 600 var(--font-size-meta) / 1 var(--font-sans); }');
    await ok('a { font: inherit; }');
    await ok('a { font-size: var(--font-size-#{$token}); }');
  });

  it('rejects raw sizes, also as fallbacks', async () => {
    await fails('a { font-size: rem(13px); }', 'shelf/font-size-token');
    await fails('a { font-size: 1.1rem; }', 'shelf/font-size-token');
    await fails('a { font-size: 0.85em; }', 'shelf/font-size-token');
    await fails('a { font-size: var(--x, #{rem(16px)}); }', 'shelf/font-size-token');
    await fails('a { font: 400 #{rem(14px)} / 1 var(--font-sans); }', 'shelf/font-size-token');
  });
});

describe('shelf/shadow-token', () => {
  it('allows shadow tokens, none, focus rings and hard-edged token rings', async () => {
    await ok('a { box-shadow: var(--shadow-l2); }');
    await ok('a { box-shadow: none; }');
    await ok('a { box-shadow: 0 0 0 3px color-mix(in srgb, var(--focus-ring) 22%, transparent); }');
    await ok('a { box-shadow: inset 0 0 0 1px var(--border); }');
    await ok('a { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--text); }');
    await ok('a { box-shadow: var(--shadow-card), inset 0 -2px 0 var(--accent); }');
    await ok('a { box-shadow: 0 0 0 2px var(--surface), var(--shadow-thumb); }');
  });

  it('rejects soft shadows that are not tokens', async () => {
    await fails('a { box-shadow: 0 8px 24px var(--overlay); }', 'shelf/shadow-token');
    await ok('a { box-shadow: 0 0 0 #{rem(2px)} var(--accent); }');
  });
});

describe('exceptions', () => {
  it('need a described disable comment', async () => {
    await ok('/* stylelint-disable-next-line color-no-hex -- mask alpha */\na { mask: #000; }');
    const rules = await lint('/* stylelint-disable-next-line color-no-hex */\na { mask: #000; }');
    assert.ok(rules.includes('--report-descriptionless-disables'), rules.join());
  });
});
