import { LINK_CLICK_ACTION, USER_LIMIT } from '@shelfmark/contracts';
import { settingsRequestProblems } from './settings-request-problems';

describe('settingsRequestProblems', () => {
  it('accepts a valid library update', () => {
    expect(
      settingsRequestProblems({
        clickAction: LINK_CLICK_ACTION.Preview,
        previewNewTabHosts: ['github.com', 'x.com'],
      }),
    ).toEqual([]);
  });

  it('accepts an empty list of sites', () => {
    expect(settingsRequestProblems({ previewNewTabHosts: [] })).toEqual([]);
  });

  it('refuses an unknown click action', () => {
    expect(settingsRequestProblems({ clickAction: 'hover' })).toEqual(['clickAction is not valid']);
  });

  it.each([
    ['not a list', 'github.com'],
    ['a scheme', ['https://github.com']],
    ['a path', ['github.com/a']],
    ['upper case', ['GitHub.com']],
    ['no dot', ['localhost']],
    ['a number', [1]],
    ['a duplicate', ['github.com', 'github.com']],
  ])('refuses previewNewTabHosts that is %s', (_name, value) => {
    expect(settingsRequestProblems({ previewNewTabHosts: value })).toEqual([
      'previewNewTabHosts is not valid',
    ]);
  });

  it('refuses more sites than the limit', () => {
    const hosts = Array.from(
      { length: USER_LIMIT.PreviewNewTabHostsMax + 1 },
      (_, index) => `site${index}.example`,
    );
    expect(settingsRequestProblems({ previewNewTabHosts: hosts })).toEqual([
      'previewNewTabHosts is not valid',
    ]);
  });

  it('refuses a field the API does not know', () => {
    expect(settingsRequestProblems({ clickActions: 'open' })).toEqual([
      'property clickActions should not exist',
    ]);
  });

  it('ignores a field that is undefined', () => {
    expect(settingsRequestProblems({ clickAction: undefined })).toEqual([]);
  });
});
