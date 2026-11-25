import type { ReaderSpan } from '@shelfmark/contracts';
import { stripControlChars } from '../../common/validation/has-control-chars';
import type { ReaderSpanStyle } from '../models/reader-span-style.interface';

const NO_STYLE: ReaderSpanStyle = { href: null, code: false, emphasis: false, strong: false };

function sameStyle(a: ReaderSpan, b: ReaderSpanStyle): boolean {
  return (
    a.href === b.href && a.code === b.code && a.emphasis === b.emphasis && a.strong === b.strong
  );
}

/**
 * Collects the inline text of one block as spans: control characters become spaces, whitespace
 * collapses across span borders, neighbours with the same style merge and the ends are trimmed.
 * `chars` counts the text so far (a cap for callers); `linkChars` the text inside links.
 */
export class SpanBuilder {
  private readonly spans: ReaderSpan[] = [];
  private endsWithSpace = true;
  chars = 0;
  linkChars = 0;

  get isEmpty(): boolean {
    return this.chars === 0;
  }

  add(raw: string, style: ReaderSpanStyle = NO_STYLE): void {
    const text = stripControlChars(raw).replace(/\s+/g, ' ');
    if (text === '') return;
    const trimmed = this.endsWithSpace && text.startsWith(' ') ? text.slice(1) : text;
    if (trimmed === '') return;
    this.endsWithSpace = trimmed.endsWith(' ');
    this.chars += trimmed.length;
    if (style.href !== null) this.linkChars += trimmed.length;
    const last = this.spans.at(-1);
    if (last !== undefined && sameStyle(last, style)) {
      last.text += trimmed;
    } else {
      this.spans.push({ text: trimmed, ...style });
    }
  }

  /** A space between two pieces (a `<br>`, the edge of a block inside a block). */
  space(): void {
    this.add(' ');
  }

  /** The spans: ends trimmed, empty ones gone, at most `max` characters in all, `maxSpans` spans. */
  finish(maxChars: number, maxSpans: number): ReaderSpan[] {
    const out: ReaderSpan[] = this.spans.map((span) => ({ ...span }));
    const first = out[0];
    if (first !== undefined) first.text = first.text.trimStart();
    const last = out.at(-1);
    if (last !== undefined) last.text = last.text.trimEnd();
    const kept: ReaderSpan[] = [];
    let left = maxChars;
    for (const span of out) {
      if (span.text === '' || kept.length >= maxSpans) continue;
      if (span.text.length >= left) {
        const cut = span.text.slice(0, Math.max(left - 1, 0)).trimEnd();
        if (cut !== '') kept.push({ ...span, text: `${cut}…` });
        break;
      }
      kept.push(span);
      left -= span.text.length;
    }
    return kept;
  }
}
