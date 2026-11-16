import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  CreateLinkRequest,
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

  create(body: CreateLinkRequest): Promise<LinkResponse> {
    return firstValueFrom(this.http.post<LinkResponse>(url(SHELFMARK_ENDPOINT.Links), body));
  }
}
