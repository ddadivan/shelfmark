import { describe, expect, it } from 'vitest';
import {
  VISIBLE_AREA_GAP_PX,
  VISIBLE_AREA_MIN_PX,
  VISIBLE_AREA_PROPERTY,
  visibleRoomBelow,
  watchVisibleArea,
} from './visible-area';

class FakeViewport extends EventTarget {
  offsetTop = 0;
  height = 800;
}

function fakeView(viewport: FakeViewport | undefined): Window & typeof globalThis {
  return { visualViewport: viewport } as unknown as Window & typeof globalThis;
}

function panelAt(top: number): HTMLElement {
  const panel = document.createElement('div');
  panel.getBoundingClientRect = () => ({ top }) as DOMRect;
  return panel;
}

describe('visible area fit', () => {
  it('measures the room down to the visible bottom, keeping a gap and a minimum', () => {
    expect(visibleRoomBelow(100, { offsetTop: 0, height: 500 })).toBe(400 - VISIBLE_AREA_GAP_PX);
    // The page scrolled under the keyboard: the visible area starts lower.
    expect(visibleRoomBelow(300, { offsetTop: 200, height: 400 })).toBe(300 - VISIBLE_AREA_GAP_PX);
    expect(visibleRoomBelow(480, { offsetTop: 0, height: 500 })).toBe(VISIBLE_AREA_MIN_PX);
  });

  it('caps the panel when the keyboard opens and clears the cap when stopped', () => {
    const viewport = new FakeViewport();
    const panel = panelAt(200);
    const stop = watchVisibleArea(() => panel, fakeView(viewport));

    viewport.height = 500;
    viewport.dispatchEvent(new Event('resize'));
    expect(panel.style.getPropertyValue(VISIBLE_AREA_PROPERTY)).toBe(
      `${300 - VISIBLE_AREA_GAP_PX}px`,
    );

    viewport.offsetTop = 100;
    viewport.dispatchEvent(new Event('scroll'));
    expect(panel.style.getPropertyValue(VISIBLE_AREA_PROPERTY)).toBe(
      `${400 - VISIBLE_AREA_GAP_PX}px`,
    );

    stop();
    expect(panel.style.getPropertyValue(VISIBLE_AREA_PROPERTY)).toBe('');
    viewport.dispatchEvent(new Event('resize'));
    expect(panel.style.getPropertyValue(VISIBLE_AREA_PROPERTY)).toBe('');
  });

  it('does nothing without a visual viewport or a panel', () => {
    expect(() => watchVisibleArea(() => null, fakeView(undefined))()).not.toThrow();
    expect(() => watchVisibleArea(() => null, null)()).not.toThrow();
    const viewport = new FakeViewport();
    const stop = watchVisibleArea(() => null, fakeView(viewport));
    expect(() => viewport.dispatchEvent(new Event('resize'))).not.toThrow();
    stop();
  });
});
