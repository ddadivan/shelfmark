/**
 * One piece of a streamed answer in reading order: plain `text`, or a citation `cite` (the source
 * number the server assigned). The server decides where citations sit, so the component never
 * parses markers out of text.
 */
export type StreamingSegment = { readonly text: string } | { readonly cite: number };
