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
} as const;
