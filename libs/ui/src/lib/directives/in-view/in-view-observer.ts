import type { InViewOptions } from './models/in-view-options.interface';

/** The nearest ancestor that scrolls vertically, or `null` when the page itself scrolls. */
export function scrollParent(element: Element): Element | null {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return parent;
    }
  }
  return null;
}

/**
 * One `IntersectionObserver` on one element, for `uiInView` and for code that needs the raw
 * entries. `start()` observes (again): the observer is rebuilt only when the root, margin or
 * thresholds changed, and an element that stays in view is reported afresh (an observer only
 * reports changes). Without `IntersectionObserver` every call does nothing.
 */
export class InViewObserver {
  private observer: IntersectionObserver | undefined;
  private key: unknown[] = [];

  constructor(
    private readonly element: Element,
    private readonly onEntries: (entries: readonly IntersectionObserverEntry[]) => void,
  ) {}

  /** The browser has an `IntersectionObserver`. */
  static get supported(): boolean {
    return typeof globalThis.IntersectionObserver === 'function';
  }

  /** (Re)starts observing; the first report of the current state follows at once. */
  start(options: InViewOptions): void {
    if (!InViewObserver.supported) {
      return;
    }
    const root = options.root === 'scroll-parent' ? scrollParent(this.element) : options.root;
    const threshold =
      typeof options.threshold === 'number' ? options.threshold : [...options.threshold];
    const key = [root, options.margin, ...[threshold].flat()];
    const same = key.length === this.key.length && key.every((part, i) => part === this.key[i]);
    if (!this.observer || !same) {
      this.observer?.disconnect();
      this.observer = new IntersectionObserver((entries) => this.onEntries(entries), {
        root,
        rootMargin: options.margin,
        threshold,
      });
      this.key = key;
    }
    this.observer.unobserve(this.element);
    this.observer.observe(this.element);
  }

  /** Stops observing; `start()` may begin again. */
  disconnect(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.key = [];
  }
}
