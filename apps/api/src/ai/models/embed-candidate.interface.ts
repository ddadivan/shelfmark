/** A live link the embed pass works on, with what its stored vector (if any) was built from. */
export interface EmbedCandidate {
  id: string;
  title: string;
  note: string | null;
  summary: string | null;
  /** `null` when the link has no vector yet. */
  inputHash: string | null;
  model: string | null;
}
