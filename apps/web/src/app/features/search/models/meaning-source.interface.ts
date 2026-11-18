import type { Signal } from '@angular/core';
import type { SearchState } from './search-state.interface';

/** What `MeaningSearch` follows: the text being typed and the settled word answer. */
export interface MeaningSource {
  /** The normalised search text, as typed. */
  readonly text: Signal<string>;
  /** The last settled word answer. */
  readonly words: Signal<SearchState>;
}
