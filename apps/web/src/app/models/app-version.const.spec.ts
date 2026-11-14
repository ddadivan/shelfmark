import { readRepoFile } from '../../testing/read-repo-file';
import { APP_VERSION } from './app-version.const';

describe('APP_VERSION', () => {
  it('is the version of the root package.json, injected at build time', () => {
    const pkg: unknown = JSON.parse(readRepoFile('package.json'));
    const version =
      typeof pkg === 'object' && pkg !== null && 'version' in pkg ? pkg.version : undefined;

    expect(APP_VERSION).toBe(version);
  });

  it('is SemVer (a "-dev" suffix only on stage)', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+(-dev)?$/);
  });
});
