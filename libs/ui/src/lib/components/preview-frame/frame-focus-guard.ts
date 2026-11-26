/**
 * Keeps keyboard focus in the app when a framed page takes it by itself (a cookie banner's
 * script calling `focus()` on load): the page's arrows would scroll the site instead of the app's
 * keys (the link preview's ↑ ↓, author round 13). A focus the user gives (the pointer is over the
 * frame: a click into the site) is left alone, so its forms and keys still work.
 *
 * The frame's own document is cross-origin and unreadable; the app only sees its window losing
 * focus to the iframe. Focus goes back to the element that had it, else to `fallback`.
 * Returns the function that stops the guard.
 */
export function guardFrameFocus(
  frames: () => readonly HTMLIFrameElement[],
  fallback: HTMLElement,
): () => void {
  const doc = fallback.ownerDocument;
  const view = doc.defaultView;
  if (!view) {
    return () => undefined;
  }
  let pointerOver = false;
  let last: Element | null = doc.activeElement;
  const isFrame = (el: Element | null): el is HTMLIFrameElement =>
    el instanceof HTMLIFrameElement && frames().includes(el);

  const onOver = (event: Event): void => {
    pointerOver = isFrame(event.target instanceof Element ? event.target : null);
  };
  const onFocusIn = (event: FocusEvent): void => {
    if (!isFrame(event.target instanceof Element ? event.target : null)) {
      last = event.target instanceof Element ? event.target : null;
    }
  };
  const onBlur = (): void => {
    // The iframe becomes the active element just after the window's blur.
    view.setTimeout(() => {
      if (pointerOver || !isFrame(doc.activeElement)) {
        return;
      }
      const target =
        last instanceof HTMLElement && last.isConnected && last !== doc.body ? last : fallback;
      target.focus({ preventScroll: true });
    });
  };

  doc.addEventListener('mouseover', onOver, true);
  doc.addEventListener('focusin', onFocusIn, true);
  view.addEventListener('blur', onBlur);
  return () => {
    doc.removeEventListener('mouseover', onOver, true);
    doc.removeEventListener('focusin', onFocusIn, true);
    view.removeEventListener('blur', onBlur);
  };
}
