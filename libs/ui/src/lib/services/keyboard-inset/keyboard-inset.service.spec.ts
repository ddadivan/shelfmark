import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compileScss } from '../../../testing/scss';
import { keyboardInset, KEYBOARD_INSET_MIN_PX } from './keyboard-inset';
import { KeyboardInset } from './keyboard-inset.service';
import { KEYBOARD_INSET_PROPERTY } from './models/keyboard-inset-property.const';

class FakeViewport extends EventTarget {
  offsetTop = 0;
  height = 800;
}

const root = () => document.documentElement;
const written = () => root().style.getPropertyValue(KEYBOARD_INSET_PROPERTY);

describe('keyboardInset', () => {
  it('is the layout height the visual viewport does not reach', () => {
    expect(keyboardInset(800, { offsetTop: 0, height: 500 })).toBe(300);
    // Safari panned the page up to keep the field in view: the keyboard covers the same part.
    expect(keyboardInset(800, { offsetTop: 120, height: 500 })).toBe(180);
  });

  it('ignores browser chrome and rounding', () => {
    expect(keyboardInset(800, { offsetTop: 0, height: 800 })).toBe(0);
    expect(keyboardInset(800, { offsetTop: 0, height: 800 - KEYBOARD_INSET_MIN_PX + 1 })).toBe(0);
    expect(keyboardInset(800, { offsetTop: 0, height: 900 })).toBe(0);
  });
});

describe('KeyboardInset', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
    root().style.removeProperty(KEYBOARD_INSET_PROPERTY);
  });

  function start(viewport: FakeViewport | undefined): KeyboardInset {
    vi.stubGlobal('visualViewport', viewport);
    vi.spyOn(root(), 'clientHeight', 'get').mockReturnValue(800);
    return TestBed.inject(KeyboardInset);
  }

  it('writes the covered height on <html> and follows the keyboard', () => {
    const viewport = new FakeViewport();
    const service = start(viewport);
    expect(written()).toBe('0px');

    viewport.height = 460;
    viewport.dispatchEvent(new Event('resize'));
    expect(written()).toBe('340px');
    expect(service.inset).toBe(340);

    viewport.offsetTop = 40;
    viewport.dispatchEvent(new Event('scroll'));
    expect(written()).toBe('300px');

    viewport.height = 800;
    viewport.offsetTop = 0;
    viewport.dispatchEvent(new Event('resize'));
    expect(written()).toBe('0px');
  });

  it('stops and clears the property when destroyed', () => {
    const viewport = new FakeViewport();
    start(viewport);
    TestBed.resetTestingModule();
    expect(written()).toBe('');
    viewport.height = 400;
    viewport.dispatchEvent(new Event('resize'));
    expect(written()).toBe('');
  });

  it('does nothing without a visual viewport', () => {
    const service = start(undefined);
    expect(written()).toBe('');
    expect(service.inset).toBe(0);
  });
});

describe('styles that keep clear of the keyboard', () => {
  const inset = 'var(--ui-keyboard-inset, 0rem)';

  it('shrinks the dialog panels by it (the wrapper padding: styles.spec.ts)', () => {
    const dialog = compileScss('lib/components/dialog/dialog.component.scss');
    expect(dialog.match(/100dvh(?! - var\(--ui-keyboard-inset)/g)).toBeNull();
    expect(dialog).toContain(`calc(100dvh - ${inset})`);
  });

  it('lifts the emoji sheet and caps the field popups', () => {
    const sheet = compileScss('lib/components/emoji-picker/emoji-picker-sheet.scss');
    expect(sheet).toContain('margin: 0 0 var(--ui-keyboard-inset, 0)');
    expect(sheet).toContain(`100dvh - ${inset} - 9.375rem`);
    for (const path of [
      'lib/components/select/select.component.scss',
      'lib/components/tag-input/tag-input.component.scss',
    ]) {
      expect(compileScss(path)).toContain('var(--ui-popup-visible-height, 100vh)');
    }
  });
});
