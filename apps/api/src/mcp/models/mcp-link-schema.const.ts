import { LINK_KIND } from '@shelfmark/contracts';

const NULLABLE_STRING = { type: ['string', 'null'] } as const;

/** JSON Schema of `McpLink`, used by the output schemas (`note` only appears for notes tokens). */
export const MCP_LINK_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Link id, for get_link' },
    url: { type: 'string' },
    title: { type: 'string' },
    host: { type: 'string' },
    folderPath: { ...NULLABLE_STRING, description: 'Folder names from the top, joined with " / "' },
    tags: { type: 'array', items: { type: 'string' } },
    summary: NULLABLE_STRING,
    summaryByAi: { type: 'boolean' },
    kind: { type: 'string', enum: Object.values(LINK_KIND) },
    isFavorite: { type: 'boolean' },
    savedAt: { type: 'string', description: 'ISO time the link was saved' },
    lastOpenedAt: NULLABLE_STRING,
    note: { ...NULLABLE_STRING, description: 'Only when the token includes notes' },
  },
  required: [
    'id',
    'url',
    'title',
    'host',
    'folderPath',
    'tags',
    'summary',
    'summaryByAi',
    'kind',
    'isFavorite',
    'savedAt',
    'lastOpenedAt',
  ],
  additionalProperties: false,
} as const;
