import { Service, signal } from '@angular/core';

/**
 * A question handed to Ask from elsewhere (the ⌘K row, the phone search row) before the panel is
 * on screen: the panel takes it once and asks it.
 */
@Service()
export class AskInbox {
  private readonly question = signal<string | null>(null);
  /** The waiting question, read by the panel's effect. */
  readonly pending = this.question.asReadonly();

  put(question: string): void {
    this.question.set(question);
  }

  /** Answers the waiting question and forgets it. */
  take(): string | null {
    const question = this.question();
    this.question.set(null);
    return question;
  }
}
