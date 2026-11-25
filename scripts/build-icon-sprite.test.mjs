import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  buildNames16File,
  buildNamesFile,
  buildSprite,
  iconNames16,
  optimizeIcon,
} from './build-icon-sprite.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wrap = (inner, attributes = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"${attributes}>${inner}</svg>`;

test('keeps the drawing, drops fill, metadata and the root attributes', () => {
  const svg = wrap(
    '<!-- c --><title>x</title><path d="M0 0h1" fill="currentColor"/>',
    ' fill="red"',
  );
  assert.equal(optimizeIcon('add', svg), '<path d="M0 0h1"/>');
});

test('sets the viewBox implicitly and rejects another grid', () => {
  assert.equal(optimizeIcon('a', '<svg><path d="M0 0"/></svg>'), '<path d="M0 0"/>');
  assert.throws(
    () => optimizeIcon('a', '<svg viewBox="0 0 16 16"><path d="M0 0"/></svg>'),
    /viewBox/,
  );
});

test('keeps fill only on the brand marks', () => {
  const svg = wrap('<path d="M0 0" fill="#4285F4"/>');
  assert.equal(optimizeIcon('google', svg), '<path d="M0 0" fill="#4285F4"/>');
  assert.equal(optimizeIcon('other', svg), '<path d="M0 0"/>');
  assert.throws(
    () => optimizeIcon('google', wrap('<path d="M0 0" fill="url(#x)"/>')),
    /plain colour/,
  );
});

test('rejects strokes, active content, styles and unknown attributes', () => {
  assert.throws(() => optimizeIcon('a', wrap('<path d="M0 0" stroke="red"/>')), /filled outlines/);
  assert.throws(() => optimizeIcon('a', wrap('<script>x</script>')), /not allowed/);
  assert.throws(() => optimizeIcon('a', wrap('<path d="M0 0" style="x:y"/>')), /"style"/);
  assert.throws(() => optimizeIcon('a', wrap('<path d="M0 0" onload="x()"/>')), /"onload"/);
  assert.throws(() => optimizeIcon('a', wrap('<g><path d="M0 0"/></g>')), /<g>/);
  assert.throws(() => optimizeIcon('a', wrap('')), /no drawing/);
});

test('sorts the symbols and writes a matching names file', () => {
  const sprite = buildSprite(['a', 'b'], () => wrap('<path d="M0 0"/>'));
  assert.equal(
    sprite,
    '<svg xmlns="http://www.w3.org/2000/svg"><symbol id="sm-a" viewBox="0 0 24 24"><path d="M0 0"/></symbol><symbol id="sm-b" viewBox="0 0 24 24"><path d="M0 0"/></symbol></svg>\n',
  );
  assert.match(buildNamesFile(['a', 'b']), /\[\n {2}'a',\n {2}'b',\n\] as const;/);
});

test('every source file builds and the committed output is fresh', () => {
  const sources = readdirSync(join(ROOT, 'libs/ui/src/icons')).filter((f) => f.endsWith('.svg'));
  assert.ok(sources.length >= 46);
  execFileSync('node', [join(ROOT, 'scripts/build-icon-sprite.mjs'), '--check'], { stdio: 'pipe' });
  const sprite = readFileSync(join(ROOT, 'libs/ui/src/assets/icons/sprite.svg'), 'utf8');
  assert.equal(sprite.match(/<symbol /g)?.length, sources.length + iconNames16().length);
});

test('strips nested comment markers to a fixed point and refuses leftovers', () => {
  // One pass over `<!<!---->--` leaves `<!--`; the loop removes what it can, the rest is refused.
  assert.equal(
    optimizeIcon('add', wrap('<!<!-- x -->-- y --><path d="M0 0h1"/>')),
    '<path d="M0 0h1"/>',
  );
  assert.throws(
    () => optimizeIcon('add', wrap('<!<!-- x --><path d="M0 0h1"/>')),
    /must be removable/,
  );
});

const wrap16 = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">${inner}</svg>`;

test('emits sm-<name>-16 symbols on the 16px grid after the 24px ones', () => {
  const sprite = buildSprite(
    ['a', 'b'],
    () => wrap('<path d="M0 0"/>'),
    ['b'],
    () => wrap16('<path d="M1 1"/>'),
  );
  assert.ok(
    sprite.endsWith(
      '<symbol id="sm-b" viewBox="0 0 24 24"><path d="M0 0"/></symbol><symbol id="sm-b-16" viewBox="0 0 16 16"><path d="M1 1"/></symbol></svg>\n',
    ),
  );
  assert.match(buildNames16File(['b']), /ICON_NAMES_16 = \[\n {2}'b',\n\] as const;/);
});

test('a 16px file needs a 24px source and the 16px grid, and keeps the allowlist', () => {
  const read = () => wrap('<path d="M0 0"/>');
  assert.throws(
    () => buildSprite(['a'], read, ['z'], () => wrap16('<path d="M0 0"/>')),
    /no 24px source/,
  );
  assert.throws(() => buildSprite(['a'], read, ['a'], read), /viewBox must be "0 0 16 16"/);
  assert.throws(
    () => buildSprite(['a'], read, ['a'], () => wrap16('<path d="M0 0" stroke="red"/>')),
    /filled outlines/,
  );
});
