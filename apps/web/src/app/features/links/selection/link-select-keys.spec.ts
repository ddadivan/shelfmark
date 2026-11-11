import { chunks } from '../bulk/chunks';
import { isTypingTarget } from './is-typing-target';
import { isLetter, linkKeyIntent } from './link-select-keys';
import { LINK_KEY_INTENT } from './models/link-key-intent.const';

function keyOn(target: HTMLElement, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  Object.defineProperty(event, 'target', { value: target });
  return event;
}

describe('linkKeyIntent', () => {
  const link = document.createElement('a');
  link.className = 'ui-card__link';
  const row = document.createElement('a');
  row.className = 'ui-list-item__link';
  const button = document.createElement('button');

  it('Space on the card or row link toggles, M moves', () => {
    expect(linkKeyIntent(keyOn(link, { key: ' ' }))).toBe(LINK_KEY_INTENT.Toggle);
    expect(linkKeyIntent(keyOn(row, { key: ' ', shiftKey: true }))).toBe(LINK_KEY_INTENT.Toggle);
    expect(linkKeyIntent(keyOn(link, { key: 'm' }))).toBe(LINK_KEY_INTENT.Move);
    expect(linkKeyIntent(keyOn(link, { key: 'M' }))).toBe(LINK_KEY_INTENT.Move);
    // A non-Latin layout: the physical key decides.
    expect(linkKeyIntent(keyOn(link, { key: 'ь', code: 'KeyM' }))).toBe(LINK_KEY_INTENT.Move);
  });

  it('ignores other targets, modifiers, Shift+M and other keys', () => {
    expect(linkKeyIntent(keyOn(button, { key: ' ' }))).toBeNull();
    expect(linkKeyIntent(keyOn(link, { key: ' ', ctrlKey: true }))).toBeNull();
    expect(linkKeyIntent(keyOn(link, { key: 'm', metaKey: true }))).toBeNull();
    expect(linkKeyIntent(keyOn(link, { key: 'M', shiftKey: true }))).toBeNull();
    expect(linkKeyIntent(keyOn(link, { key: 'x' }))).toBeNull();
    const handled = keyOn(link, { key: ' ' });
    handled.preventDefault();
    expect(linkKeyIntent(handled)).toBeNull();
  });
});

describe('isLetter', () => {
  it('matches a Latin key or, otherwise, the code', () => {
    expect(isLetter(new KeyboardEvent('keydown', { key: 'A' }), 'a', 'KeyA')).toBe(true);
    expect(isLetter(new KeyboardEvent('keydown', { key: 'b', code: 'KeyA' }), 'a', 'KeyA')).toBe(
      false,
    );
    expect(isLetter(new KeyboardEvent('keydown', { key: 'ф', code: 'KeyA' }), 'a', 'KeyA')).toBe(
      true,
    );
  });
});

describe('isTypingTarget', () => {
  it('is true in text fields, editable content, dialogs and menus', () => {
    const input = document.createElement('input');
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const inner = document.createElement('button');
    dialog.append(inner);
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    expect(isTypingTarget(input)).toBe(true);
    expect(isTypingTarget(inner)).toBe(true);
    expect(isTypingTarget(editable)).toBe(true);
  });

  it('is false for checkboxes, buttons, the page and non-elements', () => {
    const box = document.createElement('input');
    box.type = 'checkbox';
    expect(isTypingTarget(box)).toBe(false);
    expect(isTypingTarget(document.createElement('button'))).toBe(false);
    expect(isTypingTarget(document.body)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe('chunks', () => {
  it('cuts a list into slices of at most the size', () => {
    expect(chunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunks([], 2)).toEqual([]);
  });
});
