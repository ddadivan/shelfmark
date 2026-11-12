/** What the bulk tags dialog answers: names to add to and to take off every selected link. */
export interface BulkTagsChange {
  readonly add: readonly string[];
  readonly remove: readonly string[];
}
