import { maskSecret } from './mask-secret';

describe('maskSecret', () => {
  it('keeps the prefix and four characters at each end', () => {
    expect(maskSecret('smk_live_7Qh2abcdefghijklmnaX9c')).toBe('smk_live_7Qh2…aX9c');
  });

  it('hides a short or unprefixed value', () => {
    expect(maskSecret('smk_live_abcd')).toBe('smk_live_…');
    expect(maskSecret('0123456789')).toBe('0123…6789');
  });
});
