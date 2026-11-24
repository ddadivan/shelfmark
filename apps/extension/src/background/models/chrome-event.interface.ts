/** A `chrome.events.Event`: the only call the worker makes on one is `addListener`. */
export interface ChromeEvent<T extends (...args: never[]) => unknown> {
  addListener(callback: T): void;
}
