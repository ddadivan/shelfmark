import { describe, expect, it } from 'vitest';
import { HELP_INLINE } from '../models/help-inline-kind.const';
import { parseHelpInline, stripHelpInline } from './parse-help-inline';

describe('parseHelpInline', () => {
  it('returns one plain run for text without markers', () => {
    expect(parseHelpInline('Just text.')).toEqual([
      { kind: HELP_INLINE.Plain, text: 'Just text.' },
    ]);
  });

  it('splits bold control names and key caps', () => {
    expect(parseHelpInline('Open **Settings** and type `a.com` now')).toEqual([
      { kind: HELP_INLINE.Plain, text: 'Open ' },
      { kind: HELP_INLINE.Ui, text: 'Settings' },
      { kind: HELP_INLINE.Plain, text: ' and type ' },
      { kind: HELP_INLINE.Key, text: 'a.com' },
      { kind: HELP_INLINE.Plain, text: ' now' },
    ]);
  });

  it('starts and ends with a marker without empty runs', () => {
    expect(parseHelpInline('**A**`b`')).toEqual([
      { kind: HELP_INLINE.Ui, text: 'A' },
      { kind: HELP_INLINE.Key, text: 'b' },
    ]);
  });

  it('strips the markers', () => {
    expect(stripHelpInline('Press **Save** on `x`.')).toBe('Press Save on x.');
  });
});
