/** Returns the element a spec expects to exist, or fails with a clear message. */
export function queryRequired<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) {
    throw new Error(`Expected an element matching "${selector}" but none was found`);
  }
  return found;
}
