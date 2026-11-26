import { TRUNCATION_EPSILON_PX } from './models/truncation-epsilon-px.const';

/**
 * The element's text is cut right now (an ellipsis, `overflow: hidden`, a line clamp). `scrollWidth`
 * and `clientWidth` are whole pixels, so a text that overflows by less than one pixel reads as
 * fitting while the browser already draws "angul…"; the text's own width (a range over the element)
 * against its box catches that sub-pixel case. A clamped block is cut when its content is taller.
 */
export function isTextCut(element: HTMLElement): boolean {
  if (element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight) {
    return true;
  }
  const range = element.ownerDocument.createRange();
  range.selectNodeContents(element);
  if (typeof range.getBoundingClientRect !== 'function') {
    return false;
  }
  const overflow = range.getBoundingClientRect().width - element.getBoundingClientRect().width;
  return overflow > TRUNCATION_EPSILON_PX;
}
