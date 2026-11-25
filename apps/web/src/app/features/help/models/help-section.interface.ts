import type { HelpBlock } from './help-block.interface';

/** A headed part of an article (an `h2` that the "On this page" list links to). */
export interface HelpSection {
  /** The anchor id and the key `sections.<id>.title` under `help.articles.<article>.`. */
  readonly id: string;
  readonly blocks: readonly HelpBlock[];
}
