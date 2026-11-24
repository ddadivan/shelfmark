import { afterEach, describe, expect, it } from 'vitest';
import { PREVIEW_KEY } from '../models/preview-key.const';
import { previewKey } from './preview-key';

function press(key: string, target: Element, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  Object.defineProperty(event, 'target', { value: target });
  return event;
}

describe('previewKey', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('maps the arrows, Enter and Esc on the page', () => {
    expect(previewKey(press('ArrowUp', document.body))).toBe(PREVIEW_KEY.Previous);
    expect(previewKey(press('ArrowDown', document.body))).toBe(PREVIEW_KEY.Next);
    expect(previewKey(press('Enter', document.body))).toBe(PREVIEW_KEY.OpenInNewTab);
    expect(previewKey(press('Escape', document.body))).toBe(PREVIEW_KEY.Close);
  });

  it('maps F to full screen (the physical key on other layouts), not in an overlay', () => {
    expect(previewKey(press('f', document.body, { code: 'KeyF' }))).toBe(PREVIEW_KEY.FullScreen);
    expect(previewKey(press('F', document.body, { code: 'KeyF' }))).toBe(PREVIEW_KEY.FullScreen);
    expect(previewKey(press('а', document.body, { code: 'KeyF' }))).toBe(PREVIEW_KEY.FullScreen);
    expect(previewKey(press('g', document.body, { code: 'KeyG' }))).toBeNull();
    const overlay = document.createElement('div');
    overlay.className = 'cdk-overlay-container';
    const item = document.createElement('div');
    overlay.append(item);
    document.body.append(overlay);
    expect(previewKey(press('f', item, { code: 'KeyF' }))).toBeNull();
  });

  it('opens in a new tab from a feed link but not from a button', () => {
    const link = document.createElement('a');
    link.className = 'ui-list-item__link';
    const button = document.createElement('button');
    document.body.append(link, button);
    expect(previewKey(press('Enter', link))).toBe(PREVIEW_KEY.OpenInNewTab);
    expect(previewKey(press('Enter', button))).toBeNull();
  });

  it('leaves fields, widgets with their own arrows, overlays and modifiers alone', () => {
    const input = document.createElement('input');
    const tree = document.createElement('div');
    tree.setAttribute('role', 'tree');
    const item = document.createElement('div');
    tree.append(item);
    const overlay = document.createElement('div');
    overlay.className = 'cdk-overlay-container';
    const inside = document.createElement('div');
    overlay.append(inside);
    document.body.append(input, tree, overlay);
    expect(previewKey(press('ArrowDown', input))).toBeNull();
    expect(previewKey(press('ArrowDown', item))).toBeNull();
    expect(previewKey(press('Escape', inside))).toBeNull();
    expect(previewKey(press('ArrowDown', document.body, { metaKey: true }))).toBeNull();
    expect(previewKey(press('x', document.body))).toBeNull();
  });

  it('ignores a key someone else handled', () => {
    const event = press('Escape', document.body);
    event.preventDefault();
    expect(previewKey(event)).toBeNull();
  });
});
