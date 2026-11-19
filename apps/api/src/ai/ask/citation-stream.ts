import {
  ASK_EVENT_TYPE,
  ASK_LIMIT,
  type AskCiteEvent,
  type AskTextEvent,
} from '@shelfmark/contracts';

/** A citation marker that is complete: `[n]` with one to three digits (refs go up to 999). */
const MARKER = /^\[(\d{1,3})\]/u;
/** What may still become a marker once more text arrives. */
const PARTIAL = /^\[\d{0,3}$/u;

/**
 * Turns the model's text deltas into `text` and `cite` events (ADR 0052 point 4, ADR 0055 point 4).
 * A `[n]` with a known `n` (a ref the server assigned in this question) becomes a `cite`, renumbered
 * by first appearance; everything else, other brackets included ("[2024]", "[999]" from page text),
 * passes as text. Cards share the numbering (`assign`). A marker split across deltas is held back
 * (a few characters at most). Text stops at `ASK_LIMIT.AnswerMaxChars`, which marks the answer
 * truncated. `answer` is the emitted text with the renumbered markers (the turn the web keeps).
 */
export class CitationStream {
  private buffer = '';
  private chars = 0;
  private readonly numbers = new Map<number, number>();
  private readonly cites = new Set<number>();
  private cut = false;
  private text = '';

  constructor(
    private readonly isKnown: (n: number) => boolean,
    private readonly maxChars: number = ASK_LIMIT.AnswerMaxChars,
  ) {}

  /** The original numbers (refs) in the order they were first cited or shown (index + 1 = number). */
  get cited(): number[] {
    return [...this.numbers.keys()];
  }

  /** Refs cited in the text (not only shown as cards). */
  get citedInText(): number[] {
    return this.cited.filter((ref) => this.cites.has(ref));
  }

  /** The answer as emitted, with renumbered `[n]` markers. */
  get answer(): string {
    return this.text;
  }

  /** The answer number of a ref, assigned on first use (cards share the citation numbering). */
  assign(ref: number): number {
    const known = this.numbers.get(ref);
    if (known !== undefined) return known;
    const next = this.numbers.size + 1;
    this.numbers.set(ref, next);
    return next;
  }

  /** Whether text was cut at the character cap. */
  get truncated(): boolean {
    return this.cut;
  }

  /** Whether any text has been emitted. */
  get hasText(): boolean {
    return this.chars > 0;
  }

  push(delta: string): (AskTextEvent | AskCiteEvent)[] {
    if (this.cut) return [];
    this.buffer += delta;
    return this.drain(false);
  }

  /** Emits what is held back (a partial marker is text after all). */
  flush(): (AskTextEvent | AskCiteEvent)[] {
    if (this.cut) return [];
    return this.drain(true);
  }

  private drain(final: boolean): (AskTextEvent | AskCiteEvent)[] {
    const events: (AskTextEvent | AskCiteEvent)[] = [];
    let text = '';
    while (this.buffer.length > 0) {
      const open = this.buffer.indexOf('[');
      if (open === -1) {
        text += this.buffer;
        this.buffer = '';
        break;
      }
      text += this.buffer.slice(0, open);
      this.buffer = this.buffer.slice(open);
      const marker = MARKER.exec(this.buffer);
      if (marker !== null) {
        const n = Number(marker[1]);
        this.buffer = this.buffer.slice(marker[0].length);
        if (this.isKnown(n)) {
          this.emitText(text, events);
          text = '';
          if (this.cut) return events;
          const number = this.assign(n);
          this.cites.add(n);
          this.text += `[${number}]`;
          events.push({ type: ASK_EVENT_TYPE.Cite, n: number });
        } else {
          text += marker[0];
        }
        continue;
      }
      if (!final && PARTIAL.test(this.buffer)) break;
      text += '[';
      this.buffer = this.buffer.slice(1);
    }
    this.emitText(text, events);
    return events;
  }

  private emitText(text: string, events: (AskTextEvent | AskCiteEvent)[]): void {
    if (text === '' || this.cut) return;
    const chars = Array.from(text);
    const room = this.maxChars - this.chars;
    if (chars.length > room) {
      this.cut = true;
      this.buffer = '';
      if (room > 0) {
        const kept = chars.slice(0, room).join('');
        this.text += kept;
        events.push({ type: ASK_EVENT_TYPE.Text, text: kept });
      }
      this.chars = this.maxChars;
      return;
    }
    this.chars += chars.length;
    this.text += text;
    events.push({ type: ASK_EVENT_TYPE.Text, text });
  }
}
