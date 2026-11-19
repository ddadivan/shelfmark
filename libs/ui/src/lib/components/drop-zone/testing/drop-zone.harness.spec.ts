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
    expect(await loader.getAllHarnesses(UiDropZoneHarness)).toHaveLength(2);
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
