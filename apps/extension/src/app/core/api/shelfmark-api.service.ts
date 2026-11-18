import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  AiJobResponse,
  AiSettingsResponse,
  CreateAiDraftRequest,
  CreateFolderRequest,
  CreateLinkRequest,
  FolderResponse,
  GetSessionResponse,
  LinkLookupRequest,
  LinkLookupResponse,
  LinkResponse,
  ListFoldersResponse,
  ListRulesResponse,
  ListTagsResponse,
} from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { SHELFMARK_ORIGIN } from '../config/shelfmark-origin.const';
import { SHELFMARK_ENDPOINT } from './models/shelfmark-endpoint.const';

const url = (path: string): string => `${SHELFMARK_ORIGIN}${path}`;

/** The Shelfmark API, called with the browser's session cookie (`credentialsInterceptor`). */
@Service()
export class ShelfmarkApiService {
  private readonly http = inject(HttpClient);

  session(): Promise<GetSessionResponse> {
    return firstValueFrom(this.http.get<GetSessionResponse>(url(SHELFMARK_ENDPOINT.Session)));
  }

  folders(): Promise<ListFoldersResponse> {
    return firstValueFrom(this.http.get<ListFoldersResponse>(url(SHELFMARK_ENDPOINT.Folders)));
  }

  tags(): Promise<ListTagsResponse> {
    return firstValueFrom(this.http.get<ListTagsResponse>(url(SHELFMARK_ENDPOINT.Tags)));
  }

  rules(): Promise<ListRulesResponse> {
    return firstValueFrom(this.http.get<ListRulesResponse>(url(SHELFMARK_ENDPOINT.Rules)));
  }

  lookup(body: LinkLookupRequest): Promise<LinkLookupResponse> {
    return firstValueFrom(
      this.http.post<LinkLookupResponse>(url(SHELFMARK_ENDPOINT.LinkLookup), body),
    );
  }

  createFolder(body: CreateFolderRequest): Promise<FolderResponse> {
    return firstValueFrom(this.http.post<FolderResponse>(url(SHELFMARK_ENDPOINT.Folders), body));
  }

  create(body: CreateLinkRequest): Promise<LinkResponse> {
    return firstValueFrom(this.http.post<LinkResponse>(url(SHELFMARK_ENDPOINT.Links), body));
  }

  aiSettings(): Promise<AiSettingsResponse> {
    return firstValueFrom(this.http.get<AiSettingsResponse>(url(SHELFMARK_ENDPOINT.AiSettings)));
  }

  createAiDraft(body: CreateAiDraftRequest): Promise<AiJobResponse> {
    return firstValueFrom(this.http.post<AiJobResponse>(url(SHELFMARK_ENDPOINT.AiDrafts), body));
  }

  aiJob(id: string): Promise<AiJobResponse> {
    const path = SHELFMARK_ENDPOINT.AiJob.replace(':id', encodeURIComponent(id));
    return firstValueFrom(this.http.get<AiJobResponse>(url(path)));
  }
}
