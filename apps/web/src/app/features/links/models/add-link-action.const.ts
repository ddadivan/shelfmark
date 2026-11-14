/** How the add-link dialog ended (see `AddLinkResult`). */
export const ADD_LINK_ACTION = {
  Saved: 'saved',
  /** Several links were saved from the paste-many list. */
  SavedMany: 'saved-many',
  OpenExisting: 'open-existing',
  Delete: 'delete',
  /** Edit mode: "Remind me" / "Change" (#275); the caller opens the reminder dialog. */
  Remind: 'remind',
} as const;
