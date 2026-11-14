import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildNames, serializeNames } from './build-folder-emoji.mjs';

const EN = [
  { unicode: '✈️', label: 'airplane', tags: ['airplane', 'flight', 'Flight', 'travel'] },
  { unicode: '🍕', label: 'pizza', tags: ['cheese', 'slice', 'a', 'b', 'c', 'd', 'e', 'f'] },
];

test('names each emoji with its label and the distinct tags, at most six', () => {
  assert.deepEqual(buildNames(['✈️', '🍕'], EN, EN), {
    '✈️': ['airplane', 'flight', 'travel'],
    '🍕': ['pizza', 'cheese', 'slice', 'a', 'b', 'c', 'd'],
  });
});

test('matches without variation selectors and falls back to English', () => {
  const fr = [{ unicode: '✈', label: 'avion', tags: [] }];
  assert.deepEqual(buildNames(['✈️', '🍕'], fr, EN)['✈️'], ['avion']);
  assert.equal(buildNames(['✈️', '🍕'], fr, EN)['🍕'][0], 'pizza');
});

test('fails for an emoji emojibase does not know', () => {
  assert.throws(() => buildNames(['🫨'], EN, EN), /no entry for 🫨/u);
});

test('writes one emoji per line', () => {
  assert.equal(serializeNames({ '🍕': ['pizza'] }), '{\n  "🍕": ["pizza"]\n}\n');
});
