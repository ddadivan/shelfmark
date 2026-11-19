import type { CitationStream } from '../ask/citation-stream';
import type { AiProvider } from './ai-provider.interface';
import type { AskCardLoader } from './ask-card-loader.type';
import type { AskDeadlines } from './ask-deadlines.interface';
import type { AskEscalationGate } from './ask-escalation-gate.type';
import type { AskMessage } from './ask-message.type';
import type { AskModelProfile } from './ask-model-profile.interface';
import type { AskSink } from './ask-sink.interface';
import type { AskToolContext } from './ask-tool-context.interface';
import type { AskToolbox } from './ask-toolbox.interface';

/** What one profile's tool loop runs with (ADR 0055 point 5). */
export interface AskLoopParams {
  provider: AiProvider;
  profile: AskModelProfile;
  system: string;
  tools: AskToolbox;
  context: AskToolContext;
  /** History and the question message (the loop appends its rounds to a copy). */
  messages: AskMessage[];
  historyEnd: number | null;
  /** Shared across both profiles: citations, card numbers and the answer text. */
  citations: CitationStream;
  sink: AskSink;
  deadlines: AskDeadlines;
  /** `Date.now()` of the request start. */
  started: number;
  /** Aborts on the hard stop or when the client went away. */
  signal: AbortSignal;
  escalation: AskEscalationGate;
  cards: AskCardLoader;
}
