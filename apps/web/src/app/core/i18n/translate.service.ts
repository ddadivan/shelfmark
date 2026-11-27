import { inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { pluralKey } from './plural-key';

/** Translation params; values are interpolated into the text. */
type TranslateParams = Record<string, unknown>;

/**
 * Synchronous translation for classes that build texts in code (toasts, dialogs, labels), so each
 * one injects this instead of keeping its own `t()` wrapper around `TranslocoService`.
 */
@Service()
export class Translate {
  private readonly transloco = inject(TranslocoService);

  /** The text of `key` in the active language. */
  t(key: string, params?: TranslateParams): string {
    return this.transloco.translate(key, params);
  }

  /**
   * The text of the plural key `base.<category>` for `count`; `{{count}}` is the number as a
   * string unless `params` overrides it (for a formatted number).
   */
  plural(base: string, count: number, params: Record<string, string> = {}): string {
    return this.t(pluralKey(base, count), { count: String(count), ...params });
  }
}
