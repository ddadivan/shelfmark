/**
 * A provider block the loop passes back unchanged within the loop that produced it (thinking blocks
 * with their signatures); never sent to the client, logged or carried across models.
 */
export interface AskOpaqueBlock {
  type: 'opaque';
  block: unknown;
}
