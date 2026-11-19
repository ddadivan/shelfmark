/**
 * What Ask is doing while no answer text streams (ADR 0055 point 11): searching links, counting,
 * reading one link, browsing folders and tags, or looking closer (the deeper model). Never carries
 * tool names or arguments.
 */
export const ASK_ACTIVITY = {
  Search: 'search',
  Count: 'count',
  Read: 'read',
  Browse: 'browse',
  Deep: 'deep',
} as const;
