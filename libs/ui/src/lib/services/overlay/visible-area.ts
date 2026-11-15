/** Space kept between the popup and the edge of the visible area (the on-screen keyboard). */
export const VISIBLE_AREA_GAP_PX = 8;
/** The popup never shrinks below this: the search box and about two rows stay usable. */
export const VISIBLE_AREA_MIN_PX = 120;
/**
 * Set on the popup element (inherited): the panels of `ui-select` and `ui-tag-input` read it as an
 * extra `max-height` cap.
 */
export const VISIBLE_AREA_PROPERTY = '--ui-popup-visible-height';

/**
 * Room from `top` (a viewport y of the popup) down to the bottom of the visible area. On a phone
 * the on-screen keyboard shrinks only the visual viewport, so CSS `vh` and the overlay's own
 * placement still count the hidden part; this is what is really left above the keyboard.
 */
export function visibleRoomBelow(
  top: number,
  viewport: Pick<VisualViewport, 'offsetTop' | 'height'>,
): number {
  const bottom = viewport.offsetTop + viewport.height;
  return Math.max(Math.round(bottom - top - VISIBLE_AREA_GAP_PX), VISIBLE_AREA_MIN_PX);
}

/**
 * Keeps the popup `panel` within the visual viewport while it is open: on every resize or scroll of the
 * visual viewport (the keyboard opens or closes) it caps the panel height through
 * `VISIBLE_AREA_PROPERTY` (CSSOM, CSP-safe), so its list scrolls above the keyboard instead of
 * hiding under it. Returns the function that stops watching and removes the cap.
 */
export function watchVisibleArea(
  panel: () => HTMLElement | null,
  view: (Window & typeof globalThis) | null,
): () => void {
  const viewport = view?.visualViewport;
  if (!viewport) {
    return () => undefined;
  }
  const fit = (): void => {
    const element = panel();
    if (element) {
      const room = visibleRoomBelow(element.getBoundingClientRect().top, viewport);
      element.style.setProperty(VISIBLE_AREA_PROPERTY, `${room}px`);
    }
  };
  viewport.addEventListener('resize', fit);
  viewport.addEventListener('scroll', fit);
  // The keyboard may be up already (a tag typed into its field opens the popup).
  fit();
  return () => {
    viewport.removeEventListener('resize', fit);
    viewport.removeEventListener('scroll', fit);
    panel()?.style.removeProperty(VISIBLE_AREA_PROPERTY);
  };
}
