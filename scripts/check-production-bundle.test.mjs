import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { findMarkers, MOCK_MARKERS } from './check-production-bundle.mjs';

const root = mkdtempSync(join(tmpdir(), 'bundle-check-'));
after(() => rmSync(root, { recursive: true, force: true }));

function bundle(name, files) {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  for (const [file, content] of Object.entries(files)) {
    writeFileSync(join(dir, file), content);
  }
  return dir;
}

describe('findMarkers', () => {
  it('finds a marker in a script', () => {
    const dir = bundle('dirty', { 'main.js': 'x=localStorage.getItem("sm-mock-session")' });

    assert.deepEqual(findMarkers(dir), [{ file: join(dir, 'main.js'), marker: 'sm-mock-session' }]);
  });

  it('finds a marker in a nested script', () => {
    const dir = bundle('nested', {});
    mkdirSync(join(dir, 'chunks'));
    writeFileSync(join(dir, 'chunks', 'a.js'), 'email:"ada@example.com"');

    assert.equal(findMarkers(dir).length, 1);
  });

  it('passes a clean bundle and ignores non-script files', () => {
    const dir = bundle('clean', { 'main.js': 'console.log(1)', 'notes.txt': 'sm-mock-session' });

    assert.deepEqual(findMarkers(dir), []);
  });

  it('accepts extra markers', () => {
    const dir = bundle('extra', { 'main.js': 'secret-marker' });

    assert.equal(findMarkers(dir, [...MOCK_MARKERS, 'secret-marker']).length, 1);
  });

  it('fails when the output directory is missing', () => {
    assert.throws(() => findMarkers(join(root, 'missing')), /run the web build first/);
  });
});
