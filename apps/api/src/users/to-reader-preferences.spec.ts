import { READER_PREFERENCES_DEFAULT } from '@shelfmark/contracts';
import { readerColumns, toReaderPreferences } from './to-reader-preferences';

describe('toReaderPreferences', () => {
  it('reads valid columns as they are', () => {
    expect(
      toReaderPreferences({
        readerTheme: 'black',
        readerFont: 'readable',
        readerSize: 24,
        readerLineSpacing: 'compact',
        readerLineWidth: 'narrow',
        readerSavedAt: new Date(0),
      }),
    ).toEqual({
      readerTheme: 'black',
      readerFont: 'readable',
      readerSize: 24,
      readerLineSpacing: 'compact',
      readerLineWidth: 'narrow',
      readerSaved: true,
    });
  });

  it('falls back to the defaults for values past the CHECKs', () => {
    expect(
      toReaderPreferences({
        readerTheme: 'neon',
        readerFont: 'comic',
        readerSize: 99,
        readerLineSpacing: 'double',
        readerLineWidth: 'full',
        readerSavedAt: null,
      }),
    ).toEqual({ ...READER_PREFERENCES_DEFAULT, readerSaved: false });
  });
});

describe('readerColumns', () => {
  const now = new Date(0);

  it('is empty when no reading setting was sent', () => {
    expect(readerColumns({ folderColours: true }, now)).toEqual({});
  });

  it('writes the fields sent (null theme included) and marks them saved', () => {
    const columns = readerColumns({ readerTheme: null, readerSize: 20 }, now);
    expect(columns).toMatchObject({ readerTheme: null, readerSize: 20, readerSavedAt: now });
    expect(columns.readerFont).toBeUndefined();
  });
});
