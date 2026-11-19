import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { describe, expect, it } from 'vitest';
import { DropZoneComponent } from '../drop-zone.component';
import { UiDropZoneHarness } from './drop-zone.harness';

@Component({
  imports: [DropZoneComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-drop-zone
      label="Drop the file here or"
      actionLabel="Choose file"
      hint="HTML export"
      (fileSelected)="files.update((f) => [...f, $event])"
    />
    <ui-drop-zone actionLabel="Locked" [disabled]="true" [invalid]="true" />
    <ui-drop-zone
      illustration="welcome-save"
      heading="Browser bookmarks"
      text="An HTML file"
      label="or drag the file here"
      actionLabel="Pick"
    />
  `,
})
class HostComponent {
  readonly files = signal<File[]>([]);
}

describe('UiDropZoneHarness', () => {
  async function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    return { host: fixture.componentInstance, loader };
  }

  it('finds zones and reads their state', async () => {
    const { loader } = await setup();
    expect(await loader.getAllHarnesses(UiDropZoneHarness)).toHaveLength(3);
    const zone = await loader.getHarness(UiDropZoneHarness.with({ label: /Drop the file/ }));
    expect(await zone.getLabel()).toBe('Drop the file here or');
    expect(await zone.getActionLabel()).toBe('Choose file');
    expect(await zone.getHint()).toBe('HTML export');
    expect(await zone.isDisabled()).toBe(false);
    const locked = await loader.getHarness(UiDropZoneHarness.with({ disabled: true }));
    expect(await locked.getLabel()).toBe('');
    expect(await locked.getHint()).toBeNull();
    expect(await locked.isInvalid()).toBe(true);
    expect(
      await loader.getAllHarnesses(UiDropZoneHarness.with({ actionLabel: 'Locked' })),
    ).toHaveLength(1);
  });

  it('reads the stacked layout', async () => {
    const { loader } = await setup();
    const plain = await loader.getHarness(UiDropZoneHarness.with({ actionLabel: 'Choose file' }));
    expect(await plain.isStacked()).toBe(false);
    expect(await plain.getHeading()).toBeNull();
    expect(await plain.getText()).toBeNull();
    const zone = await loader.getHarness(UiDropZoneHarness.with({ actionLabel: 'Pick' }));
    expect(await zone.isStacked()).toBe(true);
    expect(await zone.getHeading()).toBe('Browser bookmarks');
    expect(await zone.getText()).toBe('An HTML file');
    expect(await zone.getLabel()).toBe('or drag the file here');
  });

  it('drags over and drops a file', async () => {
    const { loader, host } = await setup();
    const zone = await loader.getHarness(UiDropZoneHarness.with({ disabled: false }));
    await zone.dragEnter();
    expect(await zone.isDragOver()).toBe(true);
    await zone.dragLeave();
    expect(await zone.isDragOver()).toBe(false);
    const file = new File(['x'], 'bookmarks.html');
    await zone.dropFile(file);
    expect(host.files()).toEqual([file]);
    expect(await zone.isDragOver()).toBe(false);
  });

  it('clicks the action', async () => {
    const { loader } = await setup();
    const zone = await loader.getHarness(UiDropZoneHarness.with({ disabled: false }));
    await expect(zone.clickAction()).resolves.toBeUndefined();
  });
});
