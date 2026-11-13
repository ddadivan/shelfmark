import type {
  CreateLinkRequest,
  CreateLinksBatchRequest,
  CreateLinksBatchResponse,
  DeleteLinksBatchResponse,
  GetLinkResponse,
  LinkResponse,
  ListLinksQuery,
  ListLinksResponse,
  OpenLinkResponse,
  RecentLinksQuery,
  RecentLinksResponse,
  UpdateLinkRequest,
  UpdateLinksBatchRequest,
  UpdateLinksBatchResponse,
} from '@shelfmark/contracts';

/** The links endpoints (`/api/links`) as the scenarios call them; failures throw `ContractError`. */
export interface ContractLinksApi {
  create(request: CreateLinkRequest): Promise<LinkResponse>;
  list(query?: ListLinksQuery): Promise<ListLinksResponse>;
  recent(query?: RecentLinksQuery): Promise<RecentLinksResponse>;
  removeRecent(id: string): Promise<void>;
  clearRecent(): Promise<void>;
  get(id: string): Promise<GetLinkResponse>;
  update(id: string, request: UpdateLinkRequest): Promise<LinkResponse>;
  remove(id: string): Promise<void>;
  open(id: string): Promise<OpenLinkResponse>;
  createBatch(request: CreateLinksBatchRequest): Promise<CreateLinksBatchResponse>;
  removeBatch(ids: readonly string[]): Promise<DeleteLinksBatchResponse>;
  updateBatch(request: UpdateLinksBatchRequest): Promise<UpdateLinksBatchResponse>;
}
