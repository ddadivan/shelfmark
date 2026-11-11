import { fileSizeParts } from './file-size-parts';

describe('fileSizeParts', () => {
  it('rounds small files up to whole KB, at least 1', () => {
    expect(fileSizeParts(1)).toEqual({ unit: 'kb', value: 1 });
    expect(fileSizeParts(1500)).toEqual({ unit: 'kb', value: 2 });
  });

  it('shows MB with one decimal from 1 MB', () => {
    expect(fileSizeParts(1024 * 1024)).toEqual({ unit: 'mb', value: 1 });
    expect(fileSizeParts(1.55 * 1024 * 1024)).toEqual({ unit: 'mb', value: 1.6 });
  });
});
