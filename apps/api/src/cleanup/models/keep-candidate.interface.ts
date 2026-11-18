/** The live facts of one duplicate the keep rule compares (ADR 0053, plan 1.3). */
export interface KeepCandidate {
  id: string;
  /** In a live folder (not Unsorted). */
  inFolder: boolean;
  hasNote: boolean;
  /** A reminder in the future. */
  hasReminder: boolean;
  tagCount: number;
  isFavorite: boolean;
  lastOpenedAt: Date | null;
  createdAt: Date;
}
