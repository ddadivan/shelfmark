import type { AiTier } from '@shelfmark/contracts';
import type { AskDeadlines } from '../models/ask-deadlines.interface';
import type { AskEscalationGate } from '../models/ask-escalation-gate.type';
import type { AskUsageService } from './ask-usage.service';
import type { CitationStream } from './citation-stream';

/** Fixed refusals the quick model reads as the tool's error result (never repeating input). */
export const ASK_ESCALATION_REFUSAL = {
  Once: 'A deeper answer was already requested for this question; answer yourself',
  AfterText: 'A deeper answer is not available once you have started answering; answer yourself',
  Late: 'A deeper answer is not available now; answer yourself',
  UsedUp: 'Deeper answers are used up for now; answer yourself',
} as const;

/**
 * The quick model's one escalation per question (ADR 0055 point 1): honoured only before any answer
 * text reached the client, within `escalateBeforeMs` of the request start, once, and while the deep
 * allowance lasts (reserved on the question's day under the `ai-ask` lock). The deep count is given
 * back when the deep model produced no text (`settle`) or together with the question.
 */
export class AskEscalation {
  private requested = false;
  private reservedDeep = false;

  constructor(
    private readonly usage: Pick<AskUsageService, 'reserveDeep' | 'refundDeep'>,
    private readonly userId: string,
    private readonly tier: AiTier,
    private readonly day: string,
    private readonly citations: Pick<CitationStream, 'hasText'>,
    private readonly started: number,
    private readonly deadlines: Pick<AskDeadlines, 'escalateBeforeMs'>,
  ) {}

  /** Whether a deep answer is reserved for this question. */
  get reserved(): boolean {
    return this.reservedDeep;
  }

  readonly gate: AskEscalationGate = async () => {
    if (this.requested) return ASK_ESCALATION_REFUSAL.Once;
    if (this.citations.hasText) return ASK_ESCALATION_REFUSAL.AfterText;
    if (Date.now() - this.started >= this.deadlines.escalateBeforeMs) {
      return ASK_ESCALATION_REFUSAL.Late;
    }
    this.requested = true;
    if (!(await this.usage.reserveDeep(this.userId, this.tier, this.day))) {
      return ASK_ESCALATION_REFUSAL.UsedUp;
    }
    this.reservedDeep = true;
    return null;
  };

  /** Gives the deep count back (no deep text, or the question itself is refunded). */
  async refund(): Promise<void> {
    if (!this.reservedDeep) return;
    this.reservedDeep = false;
    await this.usage.refundDeep(this.userId, this.day);
  }
}
