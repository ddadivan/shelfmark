import { TestBed } from '@angular/core/testing';
import { MOCK_ID, MOCK_NAME } from '@shelfmark/contracts/testing';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import axe from 'axe-core';
import { TagsStore } from '../../../../stores/tags.store';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { LINKS_API } from '../../../links/models/links-api.const';
import { TAGS_API } from '../../../links/models/tags-api.const';
import { MockLinksApi } from '../../../links/mock/mock-links.api';
import { MockTagsApi } from '../../../links/mock/mock-tags.api';
import type { MergeTagDialogData } from '../../models/merge-tag-dialog-data.interface';
import { MergeTagDialogComponent } from './merge-tag-dialog.component';

async function setup(submit: MergeTagDialogData['submit'] = () => Promise.resolve(true)) {
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: LINKS_API, useClass: MockLinksApi },
      { provide: TAGS_API, useClass: MockTagsApi },
    ],
  });
  await loadEnglish();
  const store = TestBed.inject(TagsStore);
  await store.load();
  const tag = store.entityMap()[MOCK_ID.TagDocs];
  if (!tag) {
    throw new Error('no docs tag');
  }
  const submitSpy = vi.fn(submit);
  const ref = TestBed.inject(DialogService).open<
    MergeTagDialogComponent,
    boolean,
    MergeTagDialogData
  >(MergeTagDialogComponent, { size: DIALOG_SIZE.Sm, data: { tag, submit: submitSpy } });
  await until(() => {
    expect(root()).not.toBeNull();
  });
  return { ref, submitSpy, store };
}

function root(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.cdk-dialog-container');
}

function dialog(): HTMLElement {
  const element = root();
  if (!element) {
    throw new Error('no dialog open');
  }
  return element;
}

async function until(check: () => void): Promise<void> {
  await vi.waitFor(
    () => {
      TestBed.tick();
      check();
    },
    { timeout: 3000 },
  );
}

function button(label: string): HTMLButtonElement {
  const found = [...dialog().querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === label,
  );
  if (!found) {
    throw new Error(`no button ${label}`);
  }
  return found;
}

afterEach(() => {
  document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
    el.replaceChildren();
  });
});

describe('MergeTagDialogComponent', () => {
  it('names the tag and offers every other tag, not the source', async () => {
    await setup();

    expect(dialog().textContent).toContain(`Merge “${MOCK_NAME.TagDocs}”`);
    dialog().querySelector<HTMLElement>('ui-select button, ui-select [role="combobox"]')?.click();
    await until(() => {
      const options = [...document.querySelectorAll('[role="option"]')].map((o) => o.textContent);
      expect(options.some((text) => text?.includes(MOCK_NAME.TagRecipes))).toBe(true);
      expect(options.some((text) => text?.trim() === MOCK_NAME.TagDocs)).toBe(false);
    });
  });

  it('asks for a target before merging and sends nothing without one', async () => {
    const { submitSpy } = await setup();

    button('Merge').click();

    await until(() => {
      expect(dialog().textContent).toContain('Choose a tag to merge into');
    });
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('stays open with an error when the merge fails', async () => {
    const { ref } = await setup(() => Promise.resolve(false));
    const selectHost = dialog().querySelector('ui-select');
    expect(selectHost).not.toBeNull();
    // Choose through the form model of the dialog component.
    const closed = vi.fn();
    void ref.result.then(closed);

    const instance = ref.componentInstance as unknown as {
      form: { targetId: () => { value: { set: (value: string) => void } } };
    };
    instance.form.targetId().value.set(MOCK_ID.TagRecipes);
    button('Merge').click();

    await until(() => {
      expect(dialog().textContent).toContain('Couldn’t merge the tags'.replace('’', "'"));
    });
    expect(closed).not.toHaveBeenCalled();
  });

  it('has no axe violations', async () => {
    await setup();

    const { violations } = await axe.run(dialog(), {
      rules: { 'color-contrast': { enabled: false } },
    });

    expect(violations.map((violation) => violation.id)).toEqual([]);
  });
});
