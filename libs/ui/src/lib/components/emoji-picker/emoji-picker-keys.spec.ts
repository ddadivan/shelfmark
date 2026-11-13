import { emojiCellAction, firstGridStop, focusAfterRemoval, opensPanel } from './emoji-picker-keys';

function panel(): HTMLElement {
  const root = document.createElement('div');
  const search = document.createElement('input');
  const own = document.createElement('section');
  own.dataset['own'] = 'true';
  for (const emoji of ['🦩', '🐙']) {
    const cell = document.createElement('div');
    cell.setAttribute('role', 'gridcell');
    cell.tabIndex = emoji === '🦩' ? 0 : -1;
    cell.dataset['emoji'] = emoji;
    own.append(cell);
  }
  const plain = document.createElement('div');
  plain.dataset['emoji'] = '🍕';
  root.append(search, own, plain);
  document.body.append(root);
  return root;
}

describe('emoji picker keys', () => {
  afterEach(() => document.body.replaceChildren());

  it('chooses with Enter or Space and removes only removable own emoji', () => {
    const root = panel();
    const [flamingo, octopus] = [...root.querySelectorAll<HTMLElement>('[role="gridcell"]')];
    const plain = root.querySelector<HTMLElement>(':scope > [data-emoji]') as HTMLElement;
    const own = [
      { emoji: '🦩', name: '🦩', removeLabel: 'Remove 🦩' },
      { emoji: '🐙', name: '🐙' },
    ];
    expect(emojiCellAction('Enter', plain, own)).toEqual({ kind: 'choose', emoji: '🍕' });
    expect(emojiCellAction(' ', flamingo, own)).toEqual({ kind: 'choose', emoji: '🦩' });
    expect(emojiCellAction('Delete', flamingo, own)).toEqual({ kind: 'remove', emoji: '🦩' });
    expect(emojiCellAction('Backspace', octopus, own)).toBeNull();
    expect(emojiCellAction('Delete', plain, own)).toBeNull();
    expect(emojiCellAction('a', flamingo, own)).toBeNull();
  });

  it('moves focus after a removal and finds the first grid stop', () => {
    const root = panel();
    const cells = [...root.querySelectorAll<HTMLElement>('[role="gridcell"]')];
    focusAfterRemoval(root, 5);
    expect(document.activeElement).toBe(cells[1]);
    focusAfterRemoval(root, 0);
    expect(document.activeElement).toBe(cells[0]);
    root.querySelector('section')?.remove();
    focusAfterRemoval(root, 0);
    expect(document.activeElement).toBe(root.querySelector('input'));
    focusAfterRemoval(undefined, 0);
    expect(firstGridStop(undefined)).toBeNull();
    expect(firstGridStop(panel())?.dataset['emoji']).toBe('🦩');
  });

  it('opens the panel with Enter or ArrowDown, not while composing', () => {
    expect(opensPanel(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(true);
    expect(opensPanel(new KeyboardEvent('keydown', { key: 'ArrowDown' }))).toBe(true);
    expect(opensPanel(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true }))).toBe(
      false,
    );
    expect(opensPanel(new KeyboardEvent('keydown', { key: 'a' }))).toBe(false);
  });
});
