/** What went out through an Ask sink: any text, and a closing `done` or `error`. */
export interface AskProgress {
  text: boolean;
  ended: boolean;
}
