import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareVersions, parseVersion, versionBumpProblems } from './check-version-bump.mjs';

test('parses SemVer with an optional pre-release', () => {
  assert.deepEqual(parseVersion('2.1.0-dev'), { major: 2, minor: 1, patch: 0, pre: 'dev' });
  assert.deepEqual(parseVersion('2.0.5'), { major: 2, minor: 0, patch: 5, pre: null });
  assert.equal(parseVersion('v2.0'), null);
});

test('compares numerically and puts a pre-release before its release', () => {
  assert.ok(compareVersions('2.0.10', '2.0.9') > 0);
  assert.ok(compareVersions('2.1.0', '2.0.5') > 0);
  assert.ok(compareVersions('2.1.0-dev', '2.1.0') < 0);
  assert.equal(compareVersions('2.0.5', '2.0.5'), 0);
});

test('accepts a minor release or a patch hotfix over main', () => {
  assert.deepEqual(versionBumpProblems('2.0.5', '2.1.0'), []);
  assert.deepEqual(versionBumpProblems('2.0.5', '2.0.6'), []);
  assert.deepEqual(versionBumpProblems('0.0.0', '2.1.0'), []);
  assert.deepEqual(versionBumpProblems('', '2.1.0'), []);
});

test('rejects the same or a lower version, a -dev suffix and a non-SemVer value', () => {
  assert.equal(versionBumpProblems('2.0.5', '2.0.5').length, 1);
  assert.equal(versionBumpProblems('2.1.0', '2.0.9').length, 1);
  assert.match(versionBumpProblems('2.0.5', '2.1.0-dev')[0], /pre-release/);
  assert.match(versionBumpProblems('2.0.5', 'next')[0], /not SemVer/);
});
