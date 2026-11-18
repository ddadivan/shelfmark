/** What a rendered piece of a streamed answer is: plain text or a citation button. */
export const STREAMING_PART_KIND = {
  Text: 'text',
  Cite: 'cite',
} as const;
