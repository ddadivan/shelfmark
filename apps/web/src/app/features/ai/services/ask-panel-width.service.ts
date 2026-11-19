import { Service, signal } from '@angular/core';
import { ASK_WIDTH_STORAGE_KEY } from '../models/ask-width-storage-key.const';

function readWidth(): number | null {
  try {
    const value = Number(localStorage.getItem(ASK_WIDTH_STORAGE_KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * The width of the desktop Ask panel (#521), a device preference in `localStorage`: read once
 * (safely: blocked storage means the default width), written on every change, removed for the
 * default. The drawer clamps it to its limits.
 */
@Service()
export class AskPanelWidth {
  private readonly value = signal<number | null>(readWidth());
  readonly width = this.value.asReadonly();

  set(width: number | null): void {
    this.value.set(width);
    try {
      if (width === null) {
        localStorage.removeItem(ASK_WIDTH_STORAGE_KEY);
      } else {
        localStorage.setItem(ASK_WIDTH_STORAGE_KEY, String(width));
      }
    } catch {
      // Storage blocked: the width lasts for this page only.
    }
  }
}
