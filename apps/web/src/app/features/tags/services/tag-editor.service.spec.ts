import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TAG_LIMIT } from '@shelfmark/contracts';
import { submit } from '@angular/forms/signals';
import { TagsStore } from '../../../stores/tags.store';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { LINKS_API } from '../../links/models/links-api.const';
import { TAGS_API } from '../../links/models/tags-api.const';
import { MockLinksApi } from '../../links/mock/mock-links.api';
import { MockTagsApi } from '../../links/mock/mock-tags.api';
import { TagEditorService } from './tag-editor.service';

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([]),
      { provide: LINKS_API, useClass: MockLinksApi },
      { provide: TAGS_API, useClass: MockTagsApi },
      TagEditorService,
    ],
  });
  await loadEnglish();
  const store = TestBed.inject(TagsStore);
  await store.load();
  const editor = TestBed.inject(TagEditorService);
  const settled = vi.fn();
  editor.onSettled = settled;
  return { editor, store, settled };
}

describe('TagEditorService', () => {
  it('opens for a new tag and closes again', async () => {
    const { editor } = await setup();

    editor.open('', null, true);
    expect(editor.adding()).toBe(true);
    expect(editor.editing()).toBe(true);

    editor.close();
    expect(editor.editing()).toBe(false);
  });

  it('opens a rename with the current name and the tag id', async () => {
    const { editor } = await setup();

    editor.open('docs', 'tag-id', false);

    expect(editor.renamingId()).toBe('tag-id');
    expect(editor.form.name().value()).toBe('docs');
  });

  it('keeps the field open with a reason when the name is empty', async () => {
    const { editor, settled } = await setup();
    editor.open('', null, true);

    await submit(editor.form);

    expect(editor.fieldError()).not.toBe('');
    expect(editor.editorWide()).toBe(true);
    expect(settled).not.toHaveBeenCalled();
  });

  it('refuses a name over the length limit', async () => {
    const { editor, settled } = await setup();
    editor.open('a'.repeat(TAG_LIMIT.NameMax + 1), null, true);
    editor.form.name().value.set('a'.repeat(TAG_LIMIT.NameMax + 1));

    await submit(editor.form);

    expect(editor.fieldError()).not.toBe('');
    expect(settled).not.toHaveBeenCalled();
  });

  it('creates a tag and settles', async () => {
    const { editor, store, settled } = await setup();
    editor.open('', null, true);
    editor.form.name().value.set('brand new tag');

    await submit(editor.form);

    await vi.waitFor(() => expect(settled).toHaveBeenCalledOnce());
    const created = store.entities().find((tag) => tag.name === 'brand-new-tag');
    expect(created).toBeDefined();
    // The component focuses the chip of the new tag.
    expect(settled).toHaveBeenCalledWith(created?.id);
  });

  it('offers to merge when a rename runs into an existing name', async () => {
    const { editor, store, settled } = await setup();
    const [source, target] = store.entities();
    editor.open(source.name, source.id, false);
    editor.form.name().value.set(target.name);

    await submit(editor.form);

    expect(editor.conflict()?.id).toBe(target.id);
    expect(editor.editorWide()).toBe(true);
    expect(settled).not.toHaveBeenCalled();
    expect(store.entityMap()[source.id]?.name).toBe(source.name);
  });

  it('merges into the conflicting tag and settles', async () => {
    const { editor, store, settled } = await setup();
    const [source, target] = store.entities();
    editor.open(source.name, source.id, false);
    editor.form.name().value.set(target.name);
    await submit(editor.form);

    await editor.mergeIntoConflict();

    expect(settled).toHaveBeenCalledOnce();
    expect(editor.saving()).toBe(false);
    expect(store.entityMap()[source.id]).toBeUndefined();
    expect(store.entityMap()[target.id]).toBeDefined();
  });

  it('does nothing when there is no conflict to merge into', async () => {
    const { editor, store, settled } = await setup();
    const [source] = store.entities();
    editor.open(source.name, source.id, false);

    await editor.mergeIntoConflict();

    expect(settled).not.toHaveBeenCalled();
    expect(store.entityMap()[source.id]).toBeDefined();
  });
});
