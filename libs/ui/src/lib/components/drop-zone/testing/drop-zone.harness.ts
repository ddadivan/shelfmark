import { ComponentHarness, HarnessPredicate, type EventData } from '@angular/cdk/testing';
import { UiButtonHarness } from '../../button/testing/button.harness';
import type { DropZoneHarnessFilters } from './models/drop-zone-harness-filters.interface';

/** Harness for `ui-drop-zone`. */
export class UiDropZoneHarness extends ComponentHarness {
  static hostSelector = 'ui-drop-zone';

  /** A predicate for a drop zone with the given label, action text or disabled state. */
  static with(options: DropZoneHarnessFilters = {}): HarnessPredicate<UiDropZoneHarness> {
    return new HarnessPredicate(UiDropZoneHarness, options)
      .addOption('label', options.label, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getLabel(), label),
      )
      .addOption('actionLabel', options.actionLabel, (harness, text) =>
        HarnessPredicate.stringMatches(harness.getActionLabel(), text),
      )
      .addOption(
        'disabled',
        options.disabled,
        async (harness, disabled) => (await harness.isDisabled()) === disabled,
      );
  }

  private readonly button = this.locatorFor(UiButtonHarness);
  private readonly labelEl = this.locatorForOptional('.ui-drop-zone__label');
  private readonly hintEl = this.locatorForOptional('.ui-drop-zone__hint');
  private readonly headingEl = this.locatorForOptional('.ui-drop-zone__heading');
  private readonly textEl = this.locatorForOptional('.ui-drop-zone__text');

  /** The text before the action; empty when there is none. */
  async getLabel(): Promise<string> {
    return ((await (await this.labelEl())?.text()) ?? '').trim();
  }

  /** The text of the picker button. */
  async getActionLabel(): Promise<string> {
    return (await this.button()).getText();
  }

  /** The muted hint line; `null` when there is none. */
  async getHint(): Promise<string | null> {
    const hint = await this.hintEl();
    return hint ? (await hint.text()).trim() : null;
  }

  /** The heading of the stacked layout; `null` when there is none. */
  async getHeading(): Promise<string | null> {
    const heading = await this.headingEl();
    return heading ? (await heading.text()).trim() : null;
  }

  /** The supporting text of the stacked layout; `null` when there is none. */
  async getText(): Promise<string | null> {
    const text = await this.textEl();
    return text ? (await text.text()).trim() : null;
  }

  /** `true` in the stacked empty-state layout (an illustration is set). */
  async isStacked(): Promise<boolean> {
    return (await this.host()).hasClass('ui-drop-zone--stacked');
  }

  /** `true` while a file is dragged over the zone. */
  async isDragOver(): Promise<boolean> {
    return (await this.host()).hasClass('ui-drop-zone--over');
  }

  async isDisabled(): Promise<boolean> {
    return (await this.host()).hasClass('ui-drop-zone--disabled');
  }

  async isInvalid(): Promise<boolean> {
    return (await this.host()).hasClass('ui-drop-zone--invalid');
  }

  /** Clicks the picker button (opens the native file dialog). */
  async clickAction(): Promise<void> {
    return (await this.button()).click();
  }

  /** Starts a file drag over the zone (dragenter). */
  async dragEnter(): Promise<void> {
    return (await this.host()).dispatchEvent('dragenter', { dataTransfer: { types: ['Files'] } });
  }

  /** Ends the drag without a drop (dragleave). */
  async dragLeave(): Promise<void> {
    return (await this.host()).dispatchEvent('dragleave', { dataTransfer: { types: ['Files'] } });
  }

  /** Drops the file on the zone: dragenter, dragover, drop. */
  async dropFile(file: File): Promise<void> {
    const host = await this.host();
    // EventData only types plain data; the event gets the real File at runtime.
    const dataTransfer = { types: ['Files'], files: [file] } as unknown as EventData;
    await host.dispatchEvent('dragenter', { dataTransfer });
    await host.dispatchEvent('dragover', { dataTransfer });
    await host.dispatchEvent('drop', { dataTransfer });
  }
}
