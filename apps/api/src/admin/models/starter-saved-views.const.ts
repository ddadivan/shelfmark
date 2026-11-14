/**
 * The starter views the sign-up trigger (and, for older accounts, the migration) gives every user
 * (`20261111120000_link_kind_saved_views`). Having exactly these does not count as using saved views.
 */
export const STARTER_SAVED_VIEWS = [
  {
    name: 'Videos',
    query:
      '{"scope":"all","folderId":null,"tags":[],"kind":"video","sort":"createdAt","order":"desc","q":""}',
  },
  {
    name: 'Articles',
    query:
      '{"scope":"all","folderId":null,"tags":[],"kind":"article","sort":"createdAt","order":"desc","q":""}',
  },
] as const;
