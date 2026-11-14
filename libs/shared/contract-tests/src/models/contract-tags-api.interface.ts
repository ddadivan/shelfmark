import type {
  CreateTagRequest,
  MergeTagResponse,
  TagResponse,
  UpdateTagRequest,
} from '@shelfmark/contracts';

/** The tag endpoints (`/api/tags`) as the scenarios call them. */
export interface ContractTagsApi {
  list(): Promise<readonly TagResponse[]>;
  create(request: CreateTagRequest): Promise<TagResponse>;
  update(id: string, request: UpdateTagRequest): Promise<TagResponse>;
  remove(id: string): Promise<void>;
  merge(id: string, targetTagId: string): Promise<MergeTagResponse>;
}
