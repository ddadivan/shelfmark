import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { LINK_LIMIT } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { UI_DIALOG_DATA } from '@shelfmark/ui';
import { AppTranslocoLoader } from '../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../core/i18n/transloco.config';
import type { AddLinkData } from '../models/add-link-data.interface';
import { AddLinkFormService } from './add-link-form.service';

async function setup(data: AddLinkData = {}): Promise<AddLinkFormService> {
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: UI_DIALOG_DATA, useValue: data },
      AddLinkFormService,
    ],
  });
  await new Promise<void>((resolve) => {
    TestBed.inject(TranslocoService)
      .load(APP_LANG.En)
      .subscribe(() => {
        resolve();
      });
  });
  return TestBed.inject(AddLinkFormService);
}

describe('AddLinkFormService', () => {
  it('starts empty when adding, in the folder of the page', async () => {
    const state = await setup({ folderId: 'folder-1' });
    expect(state.editing).toBe(false);
    expect(state.model()).toMatchObject({ url: '', title: '', folderId: 'folder-1', tags: [] });
  });

  it('prefills the form from the link when editing', async () => {
    const link = MOCK_LINKS[0];
    const state = await setup({ link });
    expect(state.editing).toBe(true);
    expect(state.model()).toMatchObject({
      url: link.url,
      title: link.title,
      folderId: link.folderId,
    });
  });

  it('rejects an empty and a non-http address, accepts an http(s) one', async () => {
    const state = await setup();
    expect(state.form.url().valid()).toBe(false);
    state.form.url().value.set('ftp://example.org');
    expect(state.form.url().valid()).toBe(false);
    state.form.url().value.set('https://example.org');
    expect(state.form.url().valid()).toBe(true);
  });

  it('limits the title length', async () => {
    const state = await setup();
    state.form.title().value.set('x'.repeat(LINK_LIMIT.TitleMax + 1));
    expect(state.form.title().valid()).toBe(false);
  });

  it('requires a title only when editing', async () => {
    const adding = await setup();
    expect(adding.form.title().valid()).toBe(true);
    TestBed.resetTestingModule();
    const editing = await setup({ link: MOCK_LINKS[0] });
    editing.form.title().value.set('  ');
    expect(editing.form.title().valid()).toBe(false);
  });

  it('keeps a pasted single link as the address, several links as a list', async () => {
    const one = await setup({ text: 'see https://example.org/a' });
    expect(one.model().url).toBe('https://example.org/a');
    expect(one.handedOverMany).toBeNull();
    TestBed.resetTestingModule();
    const many = await setup({ text: 'https://example.org/a\nhttps://example.org/b' });
    expect(many.model().url).toBe('');
    expect(many.handedOverMany?.links).toHaveLength(2);
  });

  it('normalizes the tags (trimmed, without duplicates) the way the API stores them', async () => {
    const state = await setup();
    state.form.tags().value.set(['Docs', 'docs', ' Tips ']);
    TestBed.tick();
    expect(state.form.tags().value()).toEqual(['Docs', 'Tips']);
  });
});
