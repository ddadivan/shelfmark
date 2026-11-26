import { inject, Service, signal } from '@angular/core';
import { SafeStorage } from '../../../core/storage/safe-storage.service';
import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';

function readWidth(storage: SafeStorage): number | null {
  const value = storage.getNumber(STORAGE_KEY.AskWidth);
  return value !== null && Number.isInteger(value) && value > 0 ? value : null;
}

/**
 * The width of the desktop Ask panel (#521), a device preference in `localStorage`: read once
 * (safely: blocked storage means the default width), written on every change, removed for the
 * default. The drawer clamps it to its limits.
 */
@Service()
export class AskPanelWidth {
  private readonly storage = inject(SafeStorage);
  private readonly value = signal<number | null>(readWidth(this.storage));
  readonly width = this.value.asReadonly();

  set(width: number | null): void {
    this.value.set(width);
    // Storage blocked: the width lasts for this page only.
    if (width === null) {
      this.storage.remove(STORAGE_KEY.AskWidth);
    } else {
      this.storage.set(STORAGE_KEY.AskWidth, String(width));
    }
  }
}
