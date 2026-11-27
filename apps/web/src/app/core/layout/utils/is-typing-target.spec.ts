import { isTypingTarget } from './is-typing-target';

function el(tag: string, attrs: Record<string, string> = {}): HTMLElement {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  return node;
}

describe('isTypingTarget', () => {
  it('is true in text fields, editable content and text roles', () => {
    const editable = el('div', { contenteditable: 'true' });
    const child = el('b');
    editable.append(child);
    expect(isTypingTarget(el('input'))).toBe(true);
    expect(isTypingTarget(el('input', { type: 'search' }))).toBe(true);
    expect(isTypingTarget(el('textarea'))).toBe(true);
    expect(isTypingTarget(el('select'))).toBe(true);
    expect(isTypingTarget(el('div', { role: 'searchbox' }))).toBe(true);
    expect(isTypingTarget(el('div', { role: 'combobox' }))).toBe(true);
    expect(isTypingTarget(el('div', { role: 'textbox' }))).toBe(true);
    expect(isTypingTarget(editable)).toBe(true);
    expect(isTypingTarget(el('div', { contenteditable: '' }))).toBe(true);
  });

  it('is false for checkboxes, radios, button inputs, buttons, the page and non-elements', () => {
    expect(isTypingTarget(el('input', { type: 'checkbox' }))).toBe(false);
    expect(isTypingTarget(el('input', { type: 'radio' }))).toBe(false);
    expect(isTypingTarget(el('input', { type: 'submit' }))).toBe(false);
    expect(isTypingTarget(el('div', { contenteditable: 'false' }))).toBe(false);
    expect(isTypingTarget(el('button'))).toBe(false);
    expect(isTypingTarget(document.body)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });

  it('counts the inside of a dialog, menu or listbox only with overlays', () => {
    for (const role of ['dialog', 'alertdialog', 'menu', 'listbox']) {
      const overlay = el('div', { role });
      const inner = el('button');
      overlay.append(inner);
      expect(isTypingTarget(inner)).toBe(false);
      expect(isTypingTarget(inner, { overlays: true })).toBe(true);
    }
  });
});
