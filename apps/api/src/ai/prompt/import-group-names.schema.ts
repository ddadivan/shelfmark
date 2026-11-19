/**
 * JSON schema for the import-group naming answer (structured output). The answer is still checked
 * by `parseImportGroupNamesOutput`: the schema shapes it, the validator decides what is trusted.
 */
export const IMPORT_GROUP_NAMES_SCHEMA = {
  type: 'object',
  properties: {
    groups: {
      type: 'array',
      items: {
        type: 'object',
        properties: { key: { type: 'string' }, name: { type: 'string' } },
        required: ['key', 'name'],
        additionalProperties: false,
      },
    },
  },
  required: ['groups'],
  additionalProperties: false,
} as const;
