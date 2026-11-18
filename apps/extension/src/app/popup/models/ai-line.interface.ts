import type { AiLineKind } from './ai-line-kind.type';

/** The one quiet AI line of the form, as data: the component translates it. */
export interface AiLineView {
  readonly kind: AiLineKind;
  /** ISO date the monthly count resets (`limit` only). */
  readonly resetsOn?: string;
  /** The tier's monthly limit (`limit` only). */
  readonly limit?: number;
}
