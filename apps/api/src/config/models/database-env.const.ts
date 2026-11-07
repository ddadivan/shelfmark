export const DATABASE_ENV = {
  /** Pooled URL used at runtime. */
  Url: 'DATABASE_URL',
  /** Direct URL used by migrations (Prisma CLI only). */
  UrlUnpooled: 'DATABASE_URL_UNPOOLED',
} as const;
