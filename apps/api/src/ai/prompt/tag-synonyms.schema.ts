/**
 * JSON schema for the tag-synonyms answer (structured output). The answer is still checked by
 * `parseTagSynonymsOutput`: the schema shapes it, the validator decides what is trusted.
 */
export const TAG_SYNONYMS_SCHEMA = {
  type: 'object',
  properties: {
    pairs: {
      type: 'array',
      items: {
        type: 'object',
        properties: { keep: { type: 'string' }, merge: { type: 'string' } },
        required: ['keep', 'merge'],
        additionalProperties: false,
      },
    },
  },
  required: ['pairs'],
  additionalProperties: false,
} as const;
