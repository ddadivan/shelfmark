/** Which vectors `markEmbeddingsStale` flags: those of these links, or of the links with these tags. */
export type StaleTarget = { linkIds: readonly string[] } | { tagIds: readonly string[] };
