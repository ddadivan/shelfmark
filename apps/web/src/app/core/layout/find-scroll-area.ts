function scrolls(element: HTMLElement, view: Window): boolean {
  const { overflowY } = view.getComputedStyle(element);
  return overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
}

/**
 * What scrolls the content of `element`: its nearest ancestor with `overflow-y` auto or scroll
 * (a panel body, the shell's main area), else the document (the page scrolls).
 */
export function findScrollArea(element: HTMLElement): HTMLElement | Document {
  const view = element.ownerDocument.defaultView;
  if (view !== null) {
    for (let node = element.parentElement; node !== null; node = node.parentElement) {
      if (scrolls(node, view)) {
        return node;
      }
    }
  }
  return element.ownerDocument;
}
