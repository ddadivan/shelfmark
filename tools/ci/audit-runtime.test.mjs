import assert from 'node:assert/strict';
import { test } from 'node:test';
import { packageName, runtimeProblems, toolingOnly } from './audit-runtime.mjs';

const LOCK = {
  '': {},
  'node_modules/express': {},
  'node_modules/picomatch': { devOptional: true },
  'node_modules/micromatch/node_modules/picomatch': { dev: true },
  'node_modules/@img/sharp-linux-x64': { optional: true },
  'node_modules/vite': { devOptional: true },
  'node_modules/a/node_modules/vite': {},
};

const report = (...entries) => ({
  vulnerabilities: Object.fromEntries(
    entries.map(([name, severity]) => [name, { name, severity }]),
  ),
});

test('reads the package name of a nested lockfile path', () => {
  assert.equal(packageName('node_modules/a/node_modules/@s/b'), '@s/b');
  assert.equal(packageName(''), null);
});

test('a package is tooling only when every copy is dev or devOptional', () => {
  assert.equal(toolingOnly('picomatch', LOCK), true);
  assert.equal(toolingOnly('vite', LOCK), false);
  assert.equal(toolingOnly('@img/sharp-linux-x64', LOCK), false);
  assert.equal(toolingOnly('missing', LOCK), false);
});

test('blocks a high or critical advisory in a run-time package only', () => {
  assert.deepEqual(
    runtimeProblems(
      report(
        ['picomatch', 'high'],
        ['express', 'critical'],
        ['@img/sharp-linux-x64', 'high'],
        ['vite', 'moderate'],
      ),
      LOCK,
    ),
    ['express (critical)', '@img/sharp-linux-x64 (high)'],
  );
  assert.deepEqual(runtimeProblems(report(['picomatch', 'high']), LOCK), []);
  assert.deepEqual(runtimeProblems({}, LOCK), []);
});
