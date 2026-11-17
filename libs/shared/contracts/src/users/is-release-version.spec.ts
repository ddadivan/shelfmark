import { isReleaseVersion } from './is-release-version';

describe('isReleaseVersion', () => {
  it('accepts plain SemVer releases', () => {
    expect(isReleaseVersion('2.0.0')).toBe(true);
    expect(isReleaseVersion('2.10.105')).toBe(true);
  });

  it('rejects pre-releases, other shapes and non-strings', () => {
    for (const value of ['2.1.0-dev', 'v2.0.0', '2.0', '2.0.0 ', '1234.0.0', '', null, 2]) {
      expect(isReleaseVersion(value)).toBe(false);
    }
  });
});
