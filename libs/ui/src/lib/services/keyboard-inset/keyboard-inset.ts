/** Smaller differences are browser chrome or rounding, not a keyboard. */
export const KEYBOARD_INSET_MIN_PX = 60;

/**
 * Height of the part of the layout viewport that the on-screen keyboard covers: the layout
 * viewport (`clientHeight` of `<html>`) minus the bottom of the visual viewport. iOS Safari and
 * Android Chrome (default `interactive-widget=resizes-visual`, kept on purpose so the fixed tab bar
 * stays behind the keyboard) shrink only the visual viewport. Were the layout viewport to shrink
 * too, this would stay 0 and nothing would be counted twice.
 */
export function keyboardInset(
  layoutHeight: number,
  viewport: Pick<VisualViewport, 'offsetTop' | 'height'>,
): number {
  const covered = Math.round(layoutHeight - (viewport.offsetTop + viewport.height));
  return covered >= KEYBOARD_INSET_MIN_PX ? covered : 0;
}
