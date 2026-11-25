import { inject, Service } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import type { HelpSearchResult } from '../models/help-search-result.interface';
import { searchHelp } from '../utils/search-help';

/** Reads the help articles' translated texts and searches them in the active language. */
@Service()
export class HelpTextService {
  private readonly transloco = inject(TranslocoService);
  /** Read by every method, so a `computed` that uses them follows a language switch. */
  private readonly lang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  /** Any translation key; a `computed` that calls it follows a language switch. */
  translate(key: string, params?: Record<string, unknown>): string {
    this.lang();
    return this.transloco.translate(key, params);
  }

  /** The text `key` of an article (`help.articles.<id>.<key>`). */
  text(articleId: string, key: string): string {
    this.lang();
    return this.transloco.translate(`help.articles.${articleId}.${key}`);
  }

  /** The articles that hold every word of the query, best match first. */
  search(query: string): readonly HelpSearchResult[] {
    this.lang();
    return searchHelp(query, (id, key) => this.text(id, key));
  }
}
