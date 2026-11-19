/** One topic of the mock AI grouping: a folder name and the words that put a link in it. */
export interface MockGroupTopic {
  readonly name: string;
  /** Lower-case parts of the host or title. */
  readonly words: readonly string[];
}
