import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import type { LinkPreviewResponse, LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { UI_DIALOG_DATA, UiDialogRef } from '@shelfmark/ui';
import { of, throwError } from 'rxjs';
import { AppTranslocoLoader } from '../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../core/i18n/transloco.config';
import { FOLDERS_API } from '../models/folders-api.const';
import { LINKS_API } from '../models/links-api.const';
import type { AddLinkDialogData } from '../models/add-link-dialog-data.interface';
import type { LinksApi } from '../models/links-api.interface';
import { ADD_LINK_ACTION } from '../models/add-link-action.const';
import { AddLinkFormService } from './add-link-form.service';
import { AddLinkPreviewService } from './add-link-preview.service';
import { AddLinkSaveService } from './add-link-save.service';

const NOT_FETCHED: LinkPreviewResponse = {
  preview: { ...MOCK_LINKS[0], title: 'x', description: null, imageUrl: null, faviconUrl: null },
  duplicate: null,
  fetched: false,
};

async function setup(link?: LinkResponse) {
  const api = {
    preview: vi.fn<LinksApi['preview']>(() => of(NOT_FETCHED)),
    create: vi.fn<LinksApi['create']>((request) =>
      of<LinkResponse>({ ...MOCK_LINKS[0], url: request.url }),
    ),
    update: vi.fn<LinksApi['update']>((id, request) =>
      of<LinkResponse>({ ...MOCK_LINKS[0], id, ...request }),
    ),
  };
  const close = vi.fn();
  const data: AddLinkDialogData = {
    link,
    session: { saving: null, idempotencyKey: null, sentFingerprint: null },
  };
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: LINKS_API, useValue: api },
      { provide: FOLDERS_API, useValue: {} },
      { provide: UI_DIALOG_DATA, useValue: data },
      { provide: UiDialogRef, useValue: { close } },
      AddLinkFormService,
      AddLinkPreviewService,
      AddLinkSaveService,
    ],
  });
  await new Promise<void>((resolve) => {
    TestBed.inject(TranslocoService)
      .load(APP_LANG.En)
      .subscribe(() => {
        resolve();
      });
  });
  return {
    api,
    close,
    data,
    form: TestBed.inject(AddLinkFormService),
    save: TestBed.inject(AddLinkSaveService),
  };
}

describe('AddLinkSaveService', () => {
  it('creates a link and keeps the save for the service', async () => {
    const { api, close, data, form, save } = await setup();
    form.form.url().value.set('https://example.org/a');
    await save.save();
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledWith(expect.objectContaining({ action: ADD_LINK_ACTION.Saved }));
    expect(data.session.saving).not.toBeNull();
    // The spinner stays on while the dialog leaves: a second submit is ignored.
    await save.save();
    expect(api.create).toHaveBeenCalledTimes(1);
  });

  it('reuses the key when a failed save is retried with the same payload', async () => {
    const { api, form, save } = await setup();
    api.create.mockImplementationOnce(() => throwError(() => new Error('boom')));
    form.form.url().value.set('https://example.org/a');
    await save.save();
    await save.save();
    const [first, second] = api.create.mock.calls.map(([request]) => request.idempotencyKey);
    expect(first).toBeDefined();
    expect(second).toBe(first);
  });

  it('uses a new key when the payload changed', async () => {
    const { api, form, save } = await setup();
    api.create.mockImplementationOnce(() => throwError(() => new Error('boom')));
    form.form.url().value.set('https://example.org/a');
    await save.save();
    form.form.url().value.set('https://example.org/b');
    await save.save();
    const [first, second] = api.create.mock.calls.map(([request]) => request.idempotencyKey);
    expect(second).not.toBe(first);
  });

  it('sends only the changed fields when editing, nothing when nothing changed', async () => {
    const link = MOCK_LINKS[0];
    const { api, close, form, save } = await setup(link);
    await save.save();
    expect(api.update).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledWith();
    form.form.note().value.set('New note');
    await save.save();
    expect(api.update).toHaveBeenCalledWith(link.id, { note: 'New note' });
  });

  it('keeps the dialog open and reports the error when the save fails', async () => {
    const { api, close, form, save } = await setup();
    api.create.mockImplementationOnce(() => throwError(() => new Error('boom')));
    form.form.url().value.set('https://example.org/a');
    await save.save();
    expect(close).not.toHaveBeenCalled();
    expect(save.saving()).toBe(false);
    expect(save.saveError()).not.toBeNull();
  });
});
