import { tagKey } from './tag-key';

describe('tagKey', () => {
  it('compares names normalized and case-insensitively', () => {
    expect(tagKey('  Angular ')).toBe(tagKey('angular'));
    expect(tagKey('Signals')).not.toBe(tagKey('angular'));
  });
});
