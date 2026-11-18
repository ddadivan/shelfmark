import { LINK_KIND } from '@shelfmark/contracts';

const nullable = (schema: Record<string, unknown>): Record<string, unknown> => ({
  anyOf: [schema, { type: 'null' }],
});

/**
 * JSON schema for `output_config.format` (structured output). The model's answer is still checked
 * by `parseLinkOutput`: the schema shapes it, the validator decides what is trusted.
 */
export const LINK_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    tags: { type: 'array', items: { type: 'string' } },
    newTag: nullable({ type: 'string' }),
    folder: nullable({ type: 'string' }),
    summary: nullable({ type: 'string' }),
    title: nullable({ type: 'string' }),
    kind: nullable({ type: 'string', enum: Object.values(LINK_KIND) }),
  },
  required: ['tags', 'newTag', 'folder', 'summary', 'title', 'kind'],
  additionalProperties: false,
} as const;
