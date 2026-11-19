import { SAVED_VIEW_SCOPE, VIEW_DRAFT_KINDS, VIEW_DRAFT_SORT } from '@shelfmark/contracts';

const nullable = (schema: Record<string, unknown>): Record<string, unknown> => ({
  anyOf: [schema, { type: 'null' }],
});

/**
 * JSON schema for the view-from-a-phrase answer (structured output). The answer is still checked by
 * `parseViewDraftOutput`: the schema shapes it, the validator decides what is trusted.
 */
export const VIEW_DRAFT_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    scope: { type: 'string', enum: Object.values(SAVED_VIEW_SCOPE) },
    folder: nullable({ type: 'string' }),
    tags: { type: 'array', items: { type: 'string' } },
    kind: nullable({ type: 'string', enum: [...VIEW_DRAFT_KINDS] }),
    words: { type: 'string' },
    sort: nullable({ type: 'string', enum: Object.values(VIEW_DRAFT_SORT) }),
    name: { type: 'string' },
    note: nullable({ type: 'string' }),
  },
  required: ['scope', 'folder', 'tags', 'kind', 'words', 'sort', 'name', 'note'],
  additionalProperties: false,
} as const;
