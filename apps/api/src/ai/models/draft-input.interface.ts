/**
 * What Add link sent for a draft job. Held in memory by the deferred run only (never stored): a
 * draft that cannot run before the save is picked up through its link after the save.
 */
export interface DraftInput {
  url: string;
  title: string | null;
  description: string | null;
  note: string | null;
}
