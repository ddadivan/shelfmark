/**
 * Scrolls `list` (only that element) so that `option` is fully visible. Unlike
 * `scrollIntoView` it never scrolls the page or a dialog around the list.
 */
export function scrollIntoList(list: HTMLElement, option: HTMLElement): void {
  const listRect = list.getBoundingClientRect();
  const optionRect = option.getBoundingClientRect();
  if (optionRect.top < listRect.top) {
    list.scrollTop -= listRect.top - optionRect.top;
  } else if (optionRect.bottom > listRect.bottom) {
    list.scrollTop += optionRect.bottom - listRect.bottom;
  }
}
