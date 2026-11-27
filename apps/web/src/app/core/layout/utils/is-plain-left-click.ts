/** A plain primary-button click: no modifier, so the app may route it (the rest opens the link the browser's way). */
export function isPlainLeftClick(event: MouseEvent): boolean {
  return !(event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
}
