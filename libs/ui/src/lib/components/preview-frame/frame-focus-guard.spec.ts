import { afterEach, describe, expect, it, vi } from 'vitest';
import { guardFrameFocus } from './frame-focus-guard';

describe('guardFrameFocus', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.useRealTimers();
  });

  function setup() {
    const before = document.createElement('button');
    const box = document.createElement('div');
    box.tabIndex = -1;
    const frame = document.createElement('iframe');
    box.append(frame);
    document.body.append(before, box);
    const stop = guardFrameFocus(() => [frame], box);
    return { before, box, frame, stop };
  }

  it('gives focus back to the element that had it when the page takes it by itself', () => {
    vi.useFakeTimers();
    const { before, frame, stop } = setup();
    before.focus();
    frame.focus();
    window.dispatchEvent(new Event('blur'));
    vi.runAllTimers();
    expect(document.activeElement).toBe(before);
    stop();
  });

  it('falls back to the box when nothing in the app had focus', () => {
    vi.useFakeTimers();
    const { box, frame, stop } = setup();
    frame.focus();
    window.dispatchEvent(new Event('blur'));
    vi.runAllTimers();
    expect(document.activeElement).toBe(box);
    stop();
  });

  it('leaves a focus the user gave with the pointer over the frame', () => {
    vi.useFakeTimers();
    const { frame, stop } = setup();
    frame.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    frame.focus();
    window.dispatchEvent(new Event('blur'));
    vi.runAllTimers();
    expect(document.activeElement).toBe(frame);
    stop();
  });
});
