/** Smaller differences are browser chrome or rounding, not a keyboard. */
export const KEYBOARD_INSET_MIN_PX = 60;
/** A pinch zoom above this scale shrinks the visual viewport too; that is no keyboard. */
const ZOOM_TOLERANCE = 1.01;

/**
 * Height of the part of the layout viewport that the on-screen keyboard covers: the layout
 * viewport (`clientHeight` of `<html>`) minus the bottom of the visual viewport. iOS Safari and
 * Android Chrome (default `interactive-widget=resizes-visual`, kept on purpose so the fixed tab bar
 * stays behind the keyboard) shrink only the visual viewport. Were the layout viewport to shrink
 * too, this would stay 0 and nothing would be counted twice. A pinch zoom (phone, or a trackpad
 * on a desktop) also shrinks the visual viewport, so a zoomed page counts as no keyboard.
 */
export function keyboardInset(
  layoutHeight: number,
  viewport: Pick<VisualViewport, 'offsetTop' | 'height'> & Partial<Pick<VisualViewport, 'scale'>>,
): number {
  if ((viewport.scale ?? 1) > ZOOM_TOLERANCE) {
    return 0;
  }
  const covered = Math.round(layoutHeight - (viewport.offsetTop + viewport.height));
  return covered >= KEYBOARD_INSET_MIN_PX ? covered : 0;
}
