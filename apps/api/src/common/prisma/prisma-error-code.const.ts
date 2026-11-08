/** Prisma known-request error codes the services react to. */
export const PRISMA_ERROR_CODE = {
  UniqueViolation: 'P2002',
  ForeignKeyViolation: 'P2003',
  RecordNotFound: 'P2025',
} as const;
