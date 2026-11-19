import { ASK_TOOL_LIMIT } from '../../models/ask-tool-limit.const';

/**
 * Per-question link refs (ADR 0055 point 4): a link gets the next number the first time it reaches
 * the model (history links first, in turn order, then tool results), so the model never sees ids and
 * a ref from page text or a forged UUID resolves to nothing. At most `ASK_TOOL_LIMIT.RefMax` refs.
 */
export class LinkRefs {
  private readonly byId = new Map<string, number>();
  private readonly ids: string[] = [];

  /** The ref of a link id, assigned on first use; `null` once the refs are used up. */
  refFor(id: string): number | null {
    const known = this.byId.get(id);
    if (known !== undefined) return known;
    if (this.ids.length >= ASK_TOOL_LIMIT.RefMax) return null;
    this.ids.push(id);
    this.byId.set(id, this.ids.length);
    return this.ids.length;
  }

  /** The link id of a ref, `undefined` for a ref this question never assigned. */
  idFor(ref: number): string | undefined {
    return Number.isInteger(ref) && ref >= 1 ? this.ids[ref - 1] : undefined;
  }

  has(ref: number): boolean {
    return this.idFor(ref) !== undefined;
  }

  get size(): number {
    return this.ids.length;
  }
}
