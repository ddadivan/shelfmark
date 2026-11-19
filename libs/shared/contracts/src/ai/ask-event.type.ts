import type { AskActivityEvent } from './ask-activity-event.interface';
import type { AskCiteEvent } from './ask-cite-event.interface';
import type { AskDoneEvent } from './ask-done-event.interface';
import type { AskErrorEvent } from './ask-error-event.interface';
import type { AskLinksEvent } from './ask-links-event.interface';
import type { AskMetaEvent } from './ask-meta-event.interface';
import type { AskTextEvent } from './ask-text-event.interface';

/** Any event of the `POST /api/ai/ask` stream, narrowed by `type`. */
export type AskEvent =
  | AskMetaEvent
  | AskActivityEvent
  | AskTextEvent
  | AskCiteEvent
  | AskLinksEvent
  | AskDoneEvent
  | AskErrorEvent;
