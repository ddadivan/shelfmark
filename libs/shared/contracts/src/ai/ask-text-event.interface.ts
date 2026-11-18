import type { ASK_EVENT_TYPE } from './ask-event-type.const';

/** A piece of the answer, plain text (render by interpolation, never as Markdown or HTML). */
export interface AskTextEvent {
  type: typeof ASK_EVENT_TYPE.Text;
  text: string;
}
