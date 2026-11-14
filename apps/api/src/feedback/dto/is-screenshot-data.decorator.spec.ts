import { base64DecodedLength, isValidScreenshotData } from './is-screenshot-data.decorator';

const b64 = (bytes: number[], pad = 0): string =>
  Buffer.from([...bytes, ...new Array<number>(pad).fill(1)]).toString('base64');

describe('screenshot data validation', () => {
  it('computes the decoded length from the padding', () => {
    expect(base64DecodedLength('QUJD')).toBe(3);
    expect(base64DecodedLength('QUI=')).toBe(2);
    expect(base64DecodedLength('QQ==')).toBe(1);
  });

  it('accepts matching signatures', () => {
    expect(isValidScreenshotData(b64([0x89, 0x50, 0x4e, 0x47], 8), 'image/png')).toBe(true);
    expect(isValidScreenshotData(b64([0xff, 0xd8, 0xff], 8), 'image/jpeg')).toBe(true);
    expect(
      isValidScreenshotData(
        b64([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50], 4),
        'image/webp',
      ),
    ).toBe(true);
  });

  it.each([
    ['a non-string', 5, 'image/png'],
    ['an unknown type', b64([0x89, 0x50, 0x4e, 0x47], 8), 'image/gif'],
    ['a missing type', b64([0x89, 0x50, 0x4e, 0x47], 8), undefined],
    ['a signature of another type', b64([0xff, 0xd8, 0xff], 8), 'image/png'],
    ['non-canonical base64', 'iVBORw0K GgoA', 'image/png'],
    ['url-safe base64', '-_-_-_-_', 'image/png'],
  ])('rejects %s', (_label, data, type) => {
    expect(isValidScreenshotData(data, type)).toBe(false);
  });
});
