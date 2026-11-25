import assert from 'node:assert/strict';
import { test } from 'node:test';
import { circle, fill, parsePath, rounded, stroke } from './stroker.mjs';

test('a stroked line is one closed outline with round caps', () => {
  const d = stroke('M2 8H14', 2);
  assert.match(d, /^M2 7L14 7A1 1 0 0 1 14 9L2 9A1 1 0 0 1 2 7Z$/);
});

test('a stroked circle is an outer and an inner loop', () => {
  const d = stroke(circle(8, 8, 4), 2);
  assert.equal(d.match(/Z/g)?.length, 2);
  assert.match(d, /A5 5/);
  assert.match(d, /A3 3/);
});

test('rounded corners become arcs and parse back to lines and arcs', () => {
  const d = rounded(
    [
      [2, 2],
      [10, 2],
      [10, 10],
    ],
    1,
  );
  assert.match(d, /A1 1 0 0 1/);
  const [sub] = parsePath(d);
  assert.deepEqual(
    sub.segments.map((s) => s.type),
    ['L', 'A', 'L'],
  );
});

test('fill refuses a counter-clockwise shape', () => {
  assert.equal(fill('M0 0H4V4H0Z'), 'M0 0H4V4H0Z');
  assert.throws(() => fill('M0 0V4H4V0Z'), /counter-clockwise/);
});
