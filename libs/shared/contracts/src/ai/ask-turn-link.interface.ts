/** A link of an earlier Ask turn: the marker number used inside its answer and the link id. */
export interface AskTurnLink {
  /** The `[n]` marker number inside `AskTurn.answer` (cited or shown as a card), 1 to 99. */
  n: number;
  /** Link UUID; the server re-reads it with the session user and drops anything else. */
  id: string;
}
