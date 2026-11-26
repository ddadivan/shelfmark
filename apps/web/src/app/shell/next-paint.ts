/**
 * Resolves after the browser has painted the current state (a frame, then a task), so a change
 * shows before a long piece of work blocks the next frame. Resolves at once without a window.
 */
export function nextPaint(doc: Document): Promise<void> {
  const view = doc.defaultView;
  if (!view) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    view.requestAnimationFrame(() => view.setTimeout(resolve));
  });
}
