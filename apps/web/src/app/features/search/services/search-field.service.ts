import { Service, signal } from '@angular/core';

/**
 * The header search field of a wide screen (from 80em, #329) tells it is there, so the shortcut
 * can focus it instead of opening the dialog. Only one field exists; the last one registered wins.
 */
@Service()
export class SearchFieldService {
  private readonly focusField = signal<(() => boolean) | null>(null);

  /** Registers the way to focus the field (true when it did); returns the function that takes it back. */
  register(focus: () => boolean): () => void {
    this.focusField.set(focus);
    return () => {
      if (this.focusField() === focus) {
        this.focusField.set(null);
      }
    };
  }

  /** Focuses the field; false when there is none (the caller opens the dialog). */
  focus(): boolean {
    return this.focusField()?.() ?? false;
  }
}
