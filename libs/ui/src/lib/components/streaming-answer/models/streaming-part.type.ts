import type { STREAMING_PART_KIND } from './streaming-part-kind.const';

/** A segment as the template renders it: text, or a citation button that may be disabled. */
export type StreamingPart =
  | { readonly kind: typeof STREAMING_PART_KIND.Text; readonly text: string }
  | {
      readonly kind: typeof STREAMING_PART_KIND.Cite;
      readonly n: number;
      readonly disabled: boolean;
    };
