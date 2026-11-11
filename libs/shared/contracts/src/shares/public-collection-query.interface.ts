/** Query of `GET /api/public/collections/:token`. */
export interface PublicCollectionQuery {
  /** Only the links of this direct subfolder (and below it). */
  folder?: string;
  /** 1-based page of `SHARE_LIMIT.PageSize` links; at most `SHARE_LIMIT.MaxPage`. */
  page?: number;
}
