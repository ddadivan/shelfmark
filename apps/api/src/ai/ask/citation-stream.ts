import {
  ASK_EVENT_TYPE,
  ASK_LIMIT,
  type AskCiteEvent,
  type AskTextEvent,
} from '@shelfmark/contracts';

/** A citation marker that is complete: `[n]` with one or two digits. */
const MARKER = /^\[(\d{1,2})\]/u;
/** What may still become a marker once more text arrives. */
const PARTIAL = /^\[\d{0,2}$/u;

/**
 * Turns the model's text deltas into `text` and `cite` events (ADR 0051 point 4). A `[n]` with `n`
 * between 1 and the number of retrieved sources becomes a `cite`, renumbered by first appearance;
 * everything else, other brackets included ("[2024]", "[11]" with ten sources), passes as text. A
 * marker split across deltas is held back (a few characters at most). Text stops at
 * `ASK_LIMIT.AnswerMaxChars`, which marks the answer truncated.
 */
export class CitationStream {
  private buffer = '';
  private chars = 0;
  private readonly numbers = new Map<number, number>();
  private cut = false;

  constructor(
    private readonly retrieved: number,
    private readonly maxChars: number = ASK_LIMIT.AnswerMaxChars,
  ) {}

  /** The original source numbers in the order they were first cited (index + 1 = new number). */
  get cited(): number[] {
    return [...this.numbers.keys()];
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
        if (n >= 1 && n <= this.retrieved) {
          this.emitText(text, events);
          text = '';
          if (this.cut) return events;
          if (!this.numbers.has(n)) this.numbers.set(n, this.numbers.size + 1);
          events.push({ type: ASK_EVENT_TYPE.Cite, n: this.numbers.get(n) ?? 0 });
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
      if (room > 0) events.push({ type: ASK_EVENT_TYPE.Text, text: chars.slice(0, room).join('') });
      this.chars = this.maxChars;
      return;
    }
    this.chars += chars.length;
    events.push({ type: ASK_EVENT_TYPE.Text, text });
  }
}
