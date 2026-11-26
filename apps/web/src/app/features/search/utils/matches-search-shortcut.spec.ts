import { matchesSearchShortcut } from './matches-search-shortcut';

const press = (init: KeyboardEventInit): KeyboardEvent => new KeyboardEvent('keydown', init);

describe('matchesSearchShortcut', () => {
  it('matches Ctrl and Cmd + k, in either case', () => {
    expect(matchesSearchShortcut(press({ key: 'k', ctrlKey: true }))).toBe(true);
    expect(matchesSearchShortcut(press({ key: 'K', metaKey: true }))).toBe(true);
  });

  it('matches the physical K key on a non-Latin layout', () => {
    expect(matchesSearchShortcut(press({ key: 'л', code: 'KeyK', ctrlKey: true }))).toBe(true);
    expect(matchesSearchShortcut(press({ key: 'κ', code: 'KeyK', metaKey: true }))).toBe(true);
  });

  it('does not match another key, with or without a layout', () => {
    expect(matchesSearchShortcut(press({ key: 'j', code: 'KeyJ', ctrlKey: true }))).toBe(false);
    expect(matchesSearchShortcut(press({ key: 'д', code: 'KeyL', ctrlKey: true }))).toBe(false);
    // A Latin layout that moves k elsewhere: the letter wins over the position.
    expect(matchesSearchShortcut(press({ key: 'j', code: 'KeyK', ctrlKey: true }))).toBe(false);
  });

  it('needs Ctrl or Cmd', () => {
    expect(matchesSearchShortcut(press({ key: 'k' }))).toBe(false);
  });

  it('ignores Alt and Shift', () => {
    expect(matchesSearchShortcut(press({ key: 'k', ctrlKey: true, altKey: true }))).toBe(false);
    expect(matchesSearchShortcut(press({ key: 'K', ctrlKey: true, shiftKey: true }))).toBe(false);
  });

  it('ignores IME composition', () => {
    expect(matchesSearchShortcut(press({ key: 'k', ctrlKey: true, isComposing: true }))).toBe(
      false,
    );
  });

  it('ignores an event without a key', () => {
    const event = press({ ctrlKey: true, code: 'KeyK' });
    Object.defineProperty(event, 'key', { value: undefined });
    expect(matchesSearchShortcut(event)).toBe(false);
  });
});
