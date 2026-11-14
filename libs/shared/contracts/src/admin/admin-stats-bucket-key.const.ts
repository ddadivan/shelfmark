/**
 * Bucket keys of the admin usage stats besides the allow-listed values of each distribution:
 * `other` holds the merged small buckets, `never` the users who never chose (theme, language).
 */
export const ADMIN_STATS_BUCKET_KEY = { Other: 'other', Never: 'never' } as const;
