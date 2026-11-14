import { ActiveRowReset } from './active-row-reset';

describe('ActiveRowReset', () => {
  it('resets when the rows first appear and not again while nothing changes', () => {
    const reset = new ActiveRowReset('');
    expect(reset.next('', 'a|b')).toBe(false);
    expect(reset.next('', 'a|b')).toBe(false);
  });

  it('resets on a new query and once more when its results arrive', () => {
    const reset = new ActiveRowReset('');
    reset.next('', 'a|b');
    expect(reset.next('s', 'a|b')).toBe(true);
    expect(reset.next('s', 'a|b')).toBe(false);
    expect(reset.next('s', 'c|d')).toBe(true);
    expect(reset.next('s', 'c|e')).toBe(false);
  });

  it('resets once when the query and the rows change together', () => {
    const reset = new ActiveRowReset('');
    reset.next('', 'a');
    expect(reset.next('x', 'b')).toBe(true);
    expect(reset.next('x', 'c')).toBe(false);
  });

  it('keeps the active row when only the rows change', () => {
    const reset = new ActiveRowReset('q');
    reset.next('q', 'a');
    expect(reset.next('q', 'a|b')).toBe(false);
  });
});
