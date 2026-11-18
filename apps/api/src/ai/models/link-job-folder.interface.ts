/** A folder the model may pick: a short key (`f1`, `f2`, ...) mapped back server-side, never an id. */
export interface LinkJobFolder {
  key: string;
  /** Names from the top, for example `Work / Design`. */
  path: string;
}
