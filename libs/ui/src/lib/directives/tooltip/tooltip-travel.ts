/**
 * Moves a tooltip panel from where the previous one was to where it is now: a transform
 * animation (`--duration-base`, `--ease-out` read from the motion tokens) on the panel box. Does
 * nothing when the places match or the browser has no Web Animations.
 */
export function travelFrom(element: HTMLElement, from: DOMRect, view: Window | null): void {
  if (typeof element.animate !== 'function' || !view) {
    return;
  }
  const to = element.getBoundingClientRect();
  const dx = from.left - to.left;
  const dy = from.top - to.top;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
    return;
  }
  const style = view.getComputedStyle(view.document.documentElement);
  const duration = parseFloat(style.getPropertyValue('--duration-base')) || 200;
  const easing = style.getPropertyValue('--ease-out').trim() || 'ease-out';
  element.animate(
    [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
    {
      duration,
      easing,
    },
  );
}
