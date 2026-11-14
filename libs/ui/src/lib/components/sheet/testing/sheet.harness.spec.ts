import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { afterEach, describe, expect, it } from 'vitest';
import { ButtonComponent } from '../../button/button.component';
import { UiButtonHarness } from '../../button/testing/button.harness';
import { DialogService } from '../../../services/dialog/dialog.service';
import { SheetComponent } from '../sheet.component';
import { UiSheetHarness } from './sheet.harness';

@Component({
  imports: [SheetComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-sheet title="Recently opened" height="tall" closeLabel="Close">
      <ui-button slot="actions" variant="ghost" size="sm">Clear</ui-button>
      <p>Three links</p>
    </ui-sheet>
  `,
})
class RecentSheetComponent {}

@Component({
  imports: [SheetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ui-sheet title="Plain"><p>Body</p></ui-sheet>`,
})
class PlainSheetComponent {}

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class RootComponent {}

function setup() {
  const fixture = TestBed.createComponent(RootComponent);
  return {
    loader: TestbedHarnessEnvironment.documentRootLoader(fixture),
    dialogs: TestBed.inject(DialogService),
  };
}

describe('UiSheetHarness', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
      el.remove();
    });
  });

  it('reads the sheet, loads its actions and closes it', async () => {
    const { loader, dialogs } = setup();
    const ref = dialogs.open(RecentSheetComponent);
    const sheet = await loader.getHarness(UiSheetHarness.with({ title: 'Recently opened' }));
    expect(await sheet.getTitle()).toBe('Recently opened');
    expect(await sheet.getBodyText()).toContain('Three links');
    expect(await sheet.isTall()).toBe(true);
    expect(await sheet.hasCloseButton()).toBe(true);
    expect(await (await sheet.getHarness(UiButtonHarness.with({ text: 'Clear' }))).getText()).toBe(
      'Clear',
    );
    await sheet.close();
    await ref.result;
    expect(await loader.getAllHarnesses(UiSheetHarness)).toHaveLength(0);
  });

  it('closes with Esc and reads a plain sheet', async () => {
    const { loader, dialogs } = setup();
    const ref = dialogs.open(PlainSheetComponent);
    const sheet = await loader.getHarness(UiSheetHarness);
    expect(await sheet.isTall()).toBe(false);
    expect(await sheet.hasCloseButton()).toBe(false);
    await sheet.pressEscape();
    await ref.result;
    expect(await loader.getAllHarnesses(UiSheetHarness)).toHaveLength(0);
  });
});
