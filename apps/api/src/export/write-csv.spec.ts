import { CSV_BOM, csvField, csvRow } from './write-csv';

describe('write-csv', () => {
  it('leaves plain text unquoted', () => {
    expect(csvField('hello world')).toBe('hello world');
    expect(csvField('')).toBe('');
  });

  it('quotes commas, quotes, CR and LF and doubles quotes', () => {
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('a\nb')).toBe('"a\nb"');
    expect(csvField('a\r\nb')).toBe('"a\r\nb"');
  });

  it.each(['=1+1', '+1', '-1', '@SUM(A1)', '\tx', '\rx'])('guards a formula start %j', (value) => {
    const out = csvField(value);
    expect(out.replace(/^"/, '').startsWith("'")).toBe(true);
  });

  it('only guards the first character', () => {
    expect(csvField('a=b')).toBe('a=b');
  });

  it('writes CRLF-terminated rows and keeps Cyrillic', () => {
    expect(csvRow(['Привіт', 'a,b'])).toBe('Привіт,"a,b"\r\n');
  });

  it('has a UTF-8 BOM', () => {
    expect(CSV_BOM).toBe('﻿');
    expect(Buffer.from(CSV_BOM, 'utf8')).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
  });
});
