import type { AskDepth, AskTurn } from '@shelfmark/contracts';
import type { AskRecording } from './ask-recording.interface';

/** A finished Ask turn as the server stores it in the history (written by `AskService` only). */
export interface AskTurnRecord extends AskRecording {
  turn: AskTurn;
  notFound: boolean;
  truncated: boolean;
  depth: AskDepth;
}
