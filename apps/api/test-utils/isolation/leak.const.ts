/** The ways `LeakyNotesFixtureModule` breaks isolation, one controller each. */
export const LEAK = {
  /** A foreign read returns the note. */
  Read: 'read',
  /** A foreign update changes the note. */
  Update: 'update',
  /** A foreign delete removes the note. */
  Remove: 'remove',
  /** The list holds every user's notes. */
  List: 'list',
  /** A foreign read is 403 instead of 404. */
  Forbidden: 'forbidden',
  /** A foreign read is a 404 whose message differs from a missing id's. */
  Distinguishable: 'distinguishable',
  /** A foreign read is a 404 whose body carries the id. */
  Body: 'body',
  /** A foreign update answers 404 but has changed the note. */
  MutateOnMiss: 'mutate-on-miss',
  /** A foreign delete answers 404 but has removed the note. */
  DeleteOnMiss: 'delete-on-miss',
  /** A foreign id works as a reference (copy). */
  Reference: 'reference',
  /** The list is 403 for a user without notes. */
  ListStatus: 'list-status',
} as const;
