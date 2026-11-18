/**
 * Gives `navigator` a clipboard for one spec (`undefined` removes it) without replacing
 * `navigator` itself, so `navigator.language` and the rest keep working. Undo with the returned
 * function.
 */
export function stubClipboard(clipboard: Pick<Clipboard, 'writeText'> | undefined): () => void {
  const had = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });
  return () => {
    if (had) {
      Object.defineProperty(navigator, 'clipboard', had);
    } else {
      Reflect.deleteProperty(navigator, 'clipboard');
    }
  };
}
