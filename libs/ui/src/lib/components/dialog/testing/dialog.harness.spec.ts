import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { afterEach, describe, expect, it } from 'vitest';
import { ButtonComponent } from '../../button/button.component';
import { UiButtonHarness } from '../../button/testing/button.harness';
import { DialogService } from '../../../services/dialog/dialog.service';
import { DialogComponent } from '../dialog.component';
import { DIALOG_SIZE } from '../models/dialog-size.const';
import { UiDialogHarness } from './dialog.harness';
import { DIALOG_HARNESS_SLOT } from './models/dialog-harness-slot.const';

@Component({
  imports: [DialogComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog title="Add link" closeLabel="Close" size="md">
      <ui-button slot="actions" variant="ghost" size="sm">Help</ui-button>
      <p>Paste a link</p>
      <ui-button slot="footer">Cancel</ui-button>
      <ui-button slot="footer" variant="primary">Save</ui-button>
    </ui-dialog>
  `,
})
class FormDialogComponent {}

@Component({
  imports: [DialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ui-dialog title="Inline" [size]="size"><p>Body</p></ui-dialog>`,
})
class InlineHostComponent {
  readonly size = DIALOG_SIZE.Lg;
}

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class RootComponent {}

function setup() {
  const fixture = TestBed.createComponent(RootComponent);
  const loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
  const dialogs = TestBed.inject(DialogService);
  return { fixture, loader, dialogs };
}

describe('UiDialogHarness', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
      el.remove();
    });
  });

  it('reads an opened dialog and loads its content by area', async () => {
    const { loader, dialogs } = setup();
    dialogs.open(FormDialogComponent, { size: DIALOG_SIZE.Md });
    const dialog = await loader.getHarness(UiDialogHarness.with({ title: 'Add link' }));
    expect(await dialog.getTitle()).toBe('Add link');
    expect(await dialog.getBodyText()).toContain('Paste a link');
    expect(await dialog.getRole()).toBe('dialog');
    expect(await dialog.isModal()).toBe(true);
    expect(await dialog.getSize()).toBe(DIALOG_SIZE.Md);
    expect(await dialog.isSheet()).toBe(false);
    expect(await dialog.isTall()).toBe(false);
    expect(await dialog.isScrollable()).toBe(false);
    expect(await dialog.isLeaving()).toBe(false);
    expect(await dialog.hasCloseButton()).toBe(true);
    expect(await dialog.getCloseLabel()).toBe('Close');
    const footer = await dialog.getChildLoader(DIALOG_HARNESS_SLOT.Footer);
    const buttons = await footer.getAllHarnesses(UiButtonHarness);
    expect(await Promise.all(buttons.map((b) => b.getText()))).toEqual(['Cancel', 'Save']);
    const actions = await dialog.getChildLoader(DIALOG_HARNESS_SLOT.Actions);
    expect(await (await actions.getHarness(UiButtonHarness.with({ text: 'Help' }))).getText()).toBe(
      'Help',
    );
    expect(await dialog.getAllHarnesses(UiButtonHarness)).toHaveLength(4);
  });

  it('closes with the close button and with Esc', async () => {
    const { loader, dialogs } = setup();
    const first = dialogs.open(FormDialogComponent);
    await (await loader.getHarness(UiDialogHarness)).close();
    await first.result;
    expect(await loader.getAllHarnesses(UiDialogHarness)).toHaveLength(0);
    const second = dialogs.open(FormDialogComponent);
    await (await loader.getHarness(UiDialogHarness)).pressEscape();
    await second.result;
    expect(await loader.getAllHarnesses(UiDialogHarness)).toHaveLength(0);
  });

  it('answers a confirm dialog through its footer buttons', async () => {
    const { loader, dialogs } = setup();
    const answer = dialogs.confirm({
      title: 'Delete link?',
      message: 'It goes to the trash.',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
      destructive: true,
    });
    const dialog = await loader.getHarness(UiDialogHarness.with({ title: /Delete/ }));
    expect(await dialog.getRole()).toBe('alertdialog');
    expect(await dialog.getBodyText()).toBe('It goes to the trash.');
    expect(await dialog.hasCloseButton()).toBe(false);
    expect(await dialog.getCloseLabel()).toBeNull();
    await expect(dialog.close()).rejects.toThrow(/no close button/);
    await (await dialog.getHarness(UiButtonHarness.with({ text: 'Delete' }))).click();
    expect(await answer).toBe(true);
  });

  it('reads an inline dialog, which has no CDK container', async () => {
    const fixture = TestBed.createComponent(InlineHostComponent);
    const dialog = await TestbedHarnessEnvironment.loader(fixture).getHarness(UiDialogHarness);
    expect(await dialog.getRole()).toBeNull();
    expect(await dialog.isModal()).toBe(false);
    expect(await dialog.getSize()).toBe(DIALOG_SIZE.Lg);
  });
});
