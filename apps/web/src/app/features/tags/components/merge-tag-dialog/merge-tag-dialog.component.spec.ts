import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MOCK_ID, MOCK_NAME } from '@shelfmark/contracts/testing';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import { UiButtonHarness, UiDialogHarness, UiSelectHarness } from '@shelfmark/ui/testing';
import axe from 'axe-core';
import { TagsStore } from '../../../../stores/tags.store';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { LINKS_API } from '../../../links/models/links-api.const';
import { TAGS_API } from '../../../links/models/tags-api.const';
import { MockLinksApi } from '../../../links/mock/mock-links.api';
import { MockTagsApi } from '../../../links/mock/mock-tags.api';
import type { MergeTagDialogData } from '../../models/merge-tag-dialog-data.interface';
import { MergeTagDialogComponent } from './merge-tag-dialog.component';

/** An empty root view: the harness environment needs a fixture; the dialog itself is an overlay. */
@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class RootComponent {}

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
  const loader = TestbedHarnessEnvironment.documentRootLoader(
    TestBed.createComponent(RootComponent),
  );
  const harness = await loader.getHarness(UiDialogHarness);
  const select = await harness.getHarness(UiSelectHarness);
  const merge = await harness.getHarness(UiButtonHarness.with({ text: 'Merge' }));
  return { ref, submitSpy, store, harness, select, merge };
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

afterEach(() => {
  document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
    el.replaceChildren();
  });
});

describe('MergeTagDialogComponent', () => {
  it('names the tag and offers every other tag, not the source', async () => {
    const { harness, select } = await setup();

    expect(await harness.getTitle()).toContain(`Merge “${MOCK_NAME.TagDocs}”`);
    await select.open();
    const options = await Promise.all((await select.getOptions()).map((o) => o.getText()));
    expect(options.some((text) => text.includes(MOCK_NAME.TagRecipes))).toBe(true);
    expect(options.some((text) => text === MOCK_NAME.TagDocs)).toBe(false);
  });

  it('asks for a target before merging and sends nothing without one', async () => {
    const { submitSpy, merge } = await setup();

    await merge.click();

    await until(() => {
      expect(dialog().textContent).toContain('Choose a tag to merge into');
    });
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('stays open with an error when the merge fails', async () => {
    const { ref, select, merge, submitSpy } = await setup(() => Promise.resolve(false));
    const closed = vi.fn();
    void ref.result.then(closed);

    await select.chooseOption({ text: MOCK_NAME.TagRecipes });
    expect(await select.getValueText()).toBe(MOCK_NAME.TagRecipes);
    await merge.click();

    await until(() => {
      expect(dialog().textContent).toContain('Couldn’t merge the tags'.replace('’', "'"));
    });
    expect(submitSpy).toHaveBeenCalledWith(MOCK_ID.TagRecipes);
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
