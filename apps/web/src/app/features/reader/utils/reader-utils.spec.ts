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
    const settings = {
      theme: 'black',
      font: 'serif',
      size: 22,
      lineSpacing: 'relaxed',
      width: 'wide',
    };
    expect(parseReaderSettings(JSON.stringify(settings))).toEqual(settings);
  });

  it('falls back field by field and on broken or missing storage', () => {
    expect(
      parseReaderSettings(JSON.stringify({ theme: 'neon', size: 30, font: 'serif', width: 'x' })),
    ).toEqual({ theme: null, font: 'serif', size: 18, lineSpacing: 'normal', width: 'normal' });
    expect(parseReaderSettings(JSON.stringify({ size: 15.5 })).size).toBe(18);
    expect(parseReaderSettings('{nope')).toEqual(parseReaderSettings(null));
    expect(parseReaderSettings('3').size).toBe(18);
  });

  it('carries over the first version (S / M / L, Narrow / Wide, Sepia)', () => {
    expect(
      parseReaderSettings(JSON.stringify({ size: 's', font: 'serif', width: 'wide', tone: 'app' })),
    ).toEqual({ theme: null, font: 'serif', size: 16, lineSpacing: 'normal', width: 'wide' });
    expect(parseReaderSettings(JSON.stringify({ size: 'xl', tone: 'sepia' }))).toMatchObject({
      theme: 'sepia',
      size: 18,
      width: 'normal',
    });
  });
});
