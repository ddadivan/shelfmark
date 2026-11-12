import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  decide,
  decideStorybook,
  isDeployRelevant,
  isStorybookRelevant,
} from './vercel-ignore-build.mjs';

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

describe('isStorybookRelevant', () => {
  it('treats library sources, stories, styles and workspace setup as Storybook inputs', () => {
    for (const file of [
      'libs/ui/src/lib/components/button/button.component.ts',
      'libs/ui/src/lib/components/drawer/drawer.stories.ts',
      'libs/ui/.storybook/preview.ts',
      'libs/ui/src/styles/tokens.scss',
      'libs/ui/README.md',
      'package-lock.json',
      'tsconfig.base.json',
    ]) {
      assert.equal(isStorybookRelevant(file), true, file);
    }
  });

  it('ignores unit tests, the a11y runner and everything outside the library', () => {
    for (const file of [
      'libs/ui/src/lib/components/button/button.component.spec.ts',
      'libs/ui/a11y/storybook.a11y.mts',
      'apps/web/src/main.ts',
      'apps/api/src/main.ts',
      'docs/PROJECT.md',
      '.github/workflows/ci.yml',
    ]) {
      assert.equal(isStorybookRelevant(file), false, file);
    }
  });
});

describe('decideStorybook', () => {
  const input = (ref, files) => ({ ref, previousSha: 'abc', changedFiles: diff(files) });

  it('skips every branch but main', () => {
    assert.equal(decideStorybook(input('feat/x', ['libs/ui/src/index.ts'])).skip, true);
  });

  it('skips a main merge that changed no Storybook input', () => {
    assert.equal(decideStorybook(input('main', ['apps/web/src/main.ts'])).skip, true);
  });

  it('builds a main merge that changed the library', () => {
    const files = ['apps/web/src/main.ts', 'libs/ui/src/lib/components/card/card.component.scss'];
    assert.equal(decideStorybook(input('main', files)).skip, false);
  });

  it('builds on main without an earlier deployment, an empty diff or a failed diff', () => {
    assert.equal(
      decideStorybook({ ref: 'main', previousSha: undefined, changedFiles: diff([]) }).skip,
      false,
    );
    assert.equal(decideStorybook(input('main', [])).skip, false);
    assert.equal(
      decideStorybook({ ref: 'main', previousSha: 'abc', changedFiles: () => null }).skip,
      false,
    );
  });
});
