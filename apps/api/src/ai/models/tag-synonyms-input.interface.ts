/**
 * One tag-synonyms request (AI-5, ADR 0052 point 2): the user's own tag names as short keys
 * (`t1`, `t2`, ...), most used first. Never ids, links, URLs or anything else.
 */
export interface TagSynonymsInput {
  tags: { key: string; name: string }[];
}
