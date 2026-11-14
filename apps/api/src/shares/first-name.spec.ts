import { firstName } from './first-name';

describe('firstName', () => {
  it('keeps only the first word', () => {
    expect(firstName('Ada Lovelace')).toBe('Ada');
    expect(firstName('  Grace   Brewster Hopper ')).toBe('Grace');
    expect(firstName('Dmytro')).toBe('Dmytro');
  });

  it('is empty for an empty or blank name', () => {
    expect(firstName('')).toBe('');
    expect(firstName('   ')).toBe('');
  });

  it('never publishes a display name that is an email address', () => {
    expect(firstName('me@example.com')).toBe('');
    expect(firstName('me@example.com Lovelace')).toBe('');
  });

  it('cuts a very long word at 50 characters without splitting a surrogate pair', () => {
    expect(firstName('x'.repeat(80))).toHaveLength(50);
    expect([...firstName('😀'.repeat(60))]).toHaveLength(50);
  });
});
