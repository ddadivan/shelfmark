import { parseReaderSettings } from './parse-reader-settings';
import { progressToSave } from './progress-to-save';
import { readerMeta } from './reader-meta';

describe('readerMeta', () => {
  it('joins the parts that exist with a middle dot', () => {
    expect(readerMeta(['Team', null, '', '  ', '5 min read'])).toBe('Team · 5 min read');
    expect(readerMeta([])).toBe('');
  });
});

describe('progressToSave', () => {
  it('ignores the very start of a text', () => {
    expect(progressToSave(0.01, null)).toBe(false);
  });

  it('keeps the first share past the start, then only steps of 5%', () => {
    expect(progressToSave(0.1, null)).toBe(true);
    expect(progressToSave(0.12, 0.1)).toBe(false);
    expect(progressToSave(0.15, 0.1)).toBe(true);
  });

  it('always keeps the moment the text is finished', () => {
    expect(progressToSave(0.96, 0.93)).toBe(true);
    expect(progressToSave(0.97, 0.96)).toBe(false);
  });
});

describe('parseReaderSettings', () => {
  it('reads valid settings', () => {
    expect(
      parseReaderSettings(
        JSON.stringify({ size: 'l', font: 'serif', width: 'wide', tone: 'sepia' }),
      ),
    ).toEqual({ size: 'l', font: 'serif', width: 'wide', tone: 'sepia' });
  });

  it('falls back field by field and on broken or missing storage', () => {
    expect(parseReaderSettings(JSON.stringify({ size: 'xl', font: 'serif' }))).toEqual({
      size: 'm',
      font: 'serif',
      width: 'narrow',
      tone: 'app',
    });
    expect(parseReaderSettings('{nope')).toEqual(parseReaderSettings(null));
    expect(parseReaderSettings('3').size).toBe('m');
  });
});
