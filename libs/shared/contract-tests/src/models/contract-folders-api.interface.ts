import type {
  CreateFolderRequest,
  FolderDeleteMode,
  FolderResponse,
  ListFoldersResponse,
  ReorderFoldersRequest,
  UpdateFolderRequest,
} from '@shelfmark/contracts';

/** The folder endpoints (`/api/folders`) as the scenarios call them. */
export interface ContractFoldersApi {
  list(): Promise<ListFoldersResponse>;
  create(request: CreateFolderRequest): Promise<FolderResponse>;
  update(id: string, request: UpdateFolderRequest): Promise<FolderResponse>;
  reorder(request: ReorderFoldersRequest): Promise<ListFoldersResponse>;
  remove(id: string, mode: FolderDeleteMode): Promise<void>;
}
