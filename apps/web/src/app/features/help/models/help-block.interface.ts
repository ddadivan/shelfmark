import type { HelpBlockKind } from './help-block-kind.type';

/** One block of a section; `keys` are translation keys under `help.articles.<id>.`. */
export interface HelpBlock {
  readonly kind: HelpBlockKind;
  readonly keys: readonly string[];
}
