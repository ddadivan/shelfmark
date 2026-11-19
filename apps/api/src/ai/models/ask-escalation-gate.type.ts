import type { AskEscalationReason } from './ask-escalation-reason.type';

/**
 * Decides a `request_deeper_answer` call (ADR 0055 point 1): `null` accepts it (the deep answer was
 * reserved), a fixed message refuses it and becomes the tool's error result.
 */
export type AskEscalationGate = (reason: AskEscalationReason) => Promise<string | null>;
