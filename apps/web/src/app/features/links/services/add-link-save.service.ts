import { inject, Service, signal } from '@angular/core';
import {
  type CreateLinkRequest,
  type LinkResponse,
  type UpdateLinkRequest,
} from '@shelfmark/contracts';
import { injectDialogData, UiDialogRef } from '@shelfmark/ui';
import { firstValueFrom, type Observable } from 'rxjs';
import { normalizeTagNames } from '../../tags/utils/normalize-tag-names';
import { ADD_LINK_ACTION } from '../models/add-link-action.const';
import type { AddLinkDialogData } from '../models/add-link-dialog-data.interface';
import type { AddLinkResult } from '../models/add-link-result.type';
import type { AddLinkSaved } from '../models/add-link-saved.interface';
import { LINKS_API } from '../models/links-api.const';
import { isLinkKind } from '../utils/link-kind';
import { saveErrorKey } from '../utils/save-error-key';
import { AddLinkFormService } from './add-link-form.service';
import { AddLinkPreviewService } from './add-link-preview.service';

/**
 * The save flow of the add-link dialog (provided by the dialog component): builds the create
 * request (with an idempotency key that survives retries) or, in edit mode, the changed fields
 * only, sends it and closes the dialog with the result. Registers itself as the submit action of
 * the form.
 */
@Service()
export class AddLinkSaveService {
  private readonly linksApi = inject(LINKS_API);
  private readonly formState = inject(AddLinkFormService);
  private readonly previewService = inject(AddLinkPreviewService);
  private readonly ref = inject<UiDialogRef<AddLinkResult>>(UiDialogRef);
  private readonly data = injectDialogData<AddLinkDialogData>();

  readonly saving = signal(false);
  /** Translation key of why the last save failed; `null` while nothing failed. */
  readonly saveError = signal<string | null>(null);

  constructor() {
    this.formState.onSubmit(() => this.save());
  }

  async save(): Promise<undefined> {
    if (this.saving()) {
      return;
    }
    const value = this.formState.model();
    const title = value.title.trim();
    const note = value.note.trim();
    const tags = [...normalizeTagNames(value.tags)];
    let request$: Observable<LinkResponse>;
    if (this.formState.original) {
      const changes = this.changes();
      if (Object.keys(changes).length === 0) {
        this.ref.close();
        return;
      }
      request$ = this.linksApi.update(this.formState.original.id, changes);
    } else {
      const fetched = this.previewService.fetchedPreview();
      const payload: CreateLinkRequest = {
        url: value.url.trim(),
        ...(title && { title }),
        ...(note && { note }),
        ...(value.folderId !== null && { folderId: value.folderId }),
        ...(tags.length > 0 && { tags }),
        ...(fetched?.faviconUrl && { faviconUrl: fetched.faviconUrl }),
        ...(fetched?.imageUrl && { imageUrl: fetched.imageUrl }),
        // The kind the server read from the page (og:type and host); without it the server uses the host.
        ...(fetched && { kind: fetched.kind }),
      };
      request$ = this.linksApi.create({
        ...payload,
        idempotencyKey: this.keyFor(this.fingerprint(payload)),
      });
    }
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const pending = firstValueFrom(request$).then((link): AddLinkSaved => ({
        action: ADD_LINK_ACTION.Saved,
        link,
      }));
      // Kept for the service: the caller gets the result even if the dialog was dismissed meanwhile.
      this.data.session.saving = pending.catch(() => undefined);
      const saved = await pending;
      // `saving` stays on: the button keeps its spinner while the dialog leaves.
      this.ref.close(saved);
    } catch (error) {
      this.saving.set(false);
      this.saveError.set(saveErrorKey(error));
    }
  }

  /**
   * What the user entered, as text: url, note, folder, tags and the title only when typed. The
   * autofilled title and the preview hints are sent but left out, so a late preview does not
   * renew the key of a retry.
   */
  private fingerprint(payload: CreateLinkRequest): string {
    return JSON.stringify({
      url: payload.url,
      note: payload.note,
      folderId: payload.folderId,
      tags: payload.tags,
      title: this.formState.form.title().dirty() ? payload.title : undefined,
    });
  }

  /**
   * The idempotency key of this save. A retry of the same payload reuses the key (the server
   * replays it); a changed payload needs a new one, because the server ignores the payload of a
   * replayed key.
   */
  private keyFor(fingerprint: string): string {
    const session = this.data.session;
    if (
      session.idempotencyKey === null ||
      (session.sentFingerprint !== null && session.sentFingerprint !== fingerprint)
    ) {
      session.idempotencyKey = globalThis.crypto.randomUUID();
    }
    session.sentFingerprint = fingerprint;
    return session.idempotencyKey;
  }

  /** Edit mode: only the fields that differ from the saved link. */
  private changes(): UpdateLinkRequest {
    const link = this.formState.original;
    const value = this.formState.model();
    const changes: UpdateLinkRequest = {};
    if (!link) {
      return changes;
    }
    const url = value.url.trim();
    const title = value.title.trim();
    const note = value.note.trim();
    const tags = [...normalizeTagNames(value.tags)];
    if (url !== link.url) {
      changes.url = url;
    }
    if (title !== link.title) {
      changes.title = title;
    }
    if (note !== (link.note ?? '')) {
      changes.note = note === '' ? null : note;
    }
    if (value.folderId !== link.folderId) {
      changes.folderId = value.folderId;
    }
    if (value.isFavorite !== link.isFavorite) {
      changes.isFavorite = value.isFavorite;
    }
    if (value.kind !== link.kind && isLinkKind(value.kind)) {
      changes.kind = value.kind;
    }
    if (tags.length !== link.tags.length || tags.some((tag, index) => tag !== link.tags[index])) {
      changes.tags = tags;
    }
    return changes;
  }
}
