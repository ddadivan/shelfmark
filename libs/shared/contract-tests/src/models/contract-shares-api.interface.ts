import type {
  FolderShareResponse,
  PublicCollectionQuery,
  PublicCollectionResponse,
} from '@shelfmark/contracts';

/** The sharing endpoints (owner side and the public collection) as the scenarios call them. */
export interface ContractSharesApi {
  get(folderId: string): Promise<FolderShareResponse>;
  enable(folderId: string): Promise<FolderShareResponse>;
  setShowNotes(folderId: string, showNotes: boolean): Promise<FolderShareResponse>;
  reset(folderId: string): Promise<FolderShareResponse>;
  disable(folderId: string): Promise<void>;
  collection(token: string, query?: PublicCollectionQuery): Promise<PublicCollectionResponse>;
}
