import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decide, isDeployRelevant } from './vercel-ignore-build.mjs';

const diff = (files) => () => files;

describe('isDeployRelevant', () => {
  it('treats app, library, API and root config files as deployable', () => {
    for (const file of [
      'apps/web/src/main.ts',
      'apps/api/src/app/configure-app.ts',
      'libs/ui/src/index.ts',
      'libs/shared/contracts/src/index.ts',
      'api/index.mjs',
      'vercel.json',
      'package.json',
      'package-lock.json',
      'nx.json',
      'scripts/write-middleware-shell.mjs',
      'apps/web/public/locales/en.json',
    ]) {
      assert.equal(isDeployRelevant(file), true, file);
    }
  });

  it('treats docs, e2e, tests, stories and CI config as non-deployable', () => {
    for (const file of [
      'docs/PROJECT.md',
      'apps/web-e2e/src/a11y.spec.ts',
      'apps/api/src/vercel-entry.spec.ts',
      'libs/ui/src/button/button.stories.ts',
      'scripts/vercel-ignore-build.test.mjs',
      '.github/workflows/ci.yml',
      '.claude/hooks/guard.mjs',
      'tools/lighthouse/package.json',
      'CLAUDE.md',
    ]) {
      assert.equal(isDeployRelevant(file), false, file);
    }
  });
});

describe('decide', () => {
  it('always builds production', () => {
    const result = decide({
      env: 'production',
      previousSha: 'abc',
      changedFiles: diff(['docs/a.md']),
    });
    assert.equal(result.skip, false);
  });

  it('builds the first deployment of a branch', () => {
    assert.equal(
      decide({ env: 'preview', previousSha: undefined, changedFiles: diff([]) }).skip,
      false,
    );
  });

  it('builds when the diff fails', () => {
    assert.equal(
      decide({ env: 'preview', previousSha: 'abc', changedFiles: () => null }).skip,
      false,
    );
  });

  it('builds a redeploy of the same commit', () => {
    assert.equal(
      decide({ env: 'preview', previousSha: 'abc', changedFiles: diff([]) }).skip,
      false,
    );
  });

  it('builds when any changed file is deployable', () => {
    const files = ['docs/PROJECT.md', 'apps/web/src/main.ts'];
    assert.equal(
      decide({ env: 'preview', previousSha: 'abc', changedFiles: diff(files) }).skip,
      false,
    );
  });

  it('skips when only non-deploy files changed', () => {
    const files = ['apps/web-e2e/src/a11y.spec.ts', 'docs/PROJECT.md'];
    assert.equal(
      decide({ env: 'preview', previousSha: 'abc', changedFiles: diff(files) }).skip,
      true,
    );
  });
});
