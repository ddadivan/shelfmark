/** An existing tag offered while typing. */
export interface TagSuggestion {
  /** The tag text; it becomes the chip when chosen. */
  readonly name: string;
  /** How often the tag is used, as words ("12 links"); the feature supplies the text. */
  readonly countLabel?: string;
}
