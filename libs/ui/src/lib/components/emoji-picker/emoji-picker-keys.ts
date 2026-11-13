import { KEYBOARD_KEY } from '../../models/keyboard';
import type { EmojiPickerItem } from './models/emoji-picker-item.interface';

/** What a key on a focused emoji cell does. */
export type EmojiCellAction = { readonly kind: 'choose' | 'remove'; readonly emoji: string } | null;

/**
 * Enter or Space chooses the cell's emoji; Delete or Backspace removes it when the cell is in
 * "Yours" (`[data-own="true"]`) and the own item has a `removeLabel`; any other key does nothing.
 */
export function emojiCellAction(
  key: string,
  cell: HTMLElement,
  own: readonly EmojiPickerItem[],
): EmojiCellAction {
  const emoji = cell.dataset['emoji'] ?? '';
  if (key === KEYBOARD_KEY.Enter || key === KEYBOARD_KEY.Space) {
    return { kind: 'choose', emoji };
  }
  if (
    (key === KEYBOARD_KEY.Delete || key === KEYBOARD_KEY.Backspace) &&
    cell.closest('[data-own="true"]') &&
    own.some((item) => item.emoji === emoji && item.removeLabel)
  ) {
    return { kind: 'remove', emoji };
  }
  return null;
}

/** After a removal: the own emoji now at `index` (else the last one), else the search box. */
export function focusAfterRemoval(panel: HTMLElement | undefined, index: number): void {
  const cells = [
    ...(panel?.querySelectorAll<HTMLElement>('[data-own="true"] [role="gridcell"]') ?? []),
  ];
  const next = cells[Math.min(index, cells.length - 1)];
  (next ?? panel?.querySelector<HTMLElement>('input'))?.focus();
}

/** The cell the arrows continue from (the active one of the first grid). */
export function firstGridStop(body: HTMLElement | undefined): HTMLElement | null {
  return body?.querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]') ?? null;
}

/** Enter or ArrowDown on the closed field opens the panel (not while an IME composes). */
export function opensPanel(event: KeyboardEvent): boolean {
  return (
    (event.key === KEYBOARD_KEY.Enter || event.key === KEYBOARD_KEY.ArrowDown) && !event.isComposing
  );
}
