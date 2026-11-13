import type {
  CreateSavedViewRequest,
  ListSavedViewsQuery,
  ListSavedViewsResponse,
  SavedViewResponse,
  UpdateSavedViewRequest,
} from '@shelfmark/contracts';

/** The saved view endpoints (`/api/views`) as the scenarios call them. */
export interface ContractViewsApi {
  list(feed?: ListSavedViewsQuery): Promise<ListSavedViewsResponse>;
  create(request: CreateSavedViewRequest): Promise<SavedViewResponse>;
  update(id: string, request: UpdateSavedViewRequest): Promise<SavedViewResponse>;
  remove(id: string): Promise<void>;
  reorder(ids: readonly string[]): Promise<ListSavedViewsResponse>;
}
