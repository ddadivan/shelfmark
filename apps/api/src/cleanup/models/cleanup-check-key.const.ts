/** The registered clean-up checks (`CleanupCheck.key`); #397 adds a dead-link check. */
export const CLEANUP_CHECK_KEY = {
  ExactDuplicates: 'exact-duplicates',
  TagVariants: 'tag-variants',
  NearDuplicates: 'near-duplicates',
  TagSynonyms: 'tag-synonyms',
} as const;
