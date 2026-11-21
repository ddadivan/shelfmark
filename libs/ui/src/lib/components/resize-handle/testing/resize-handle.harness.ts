import { ComponentHarness, TestKey } from '@angular/cdk/testing';

const KEYS = {
  ArrowLeft: TestKey.LEFT_ARROW,
  ArrowRight: TestKey.RIGHT_ARROW,
  Home: TestKey.HOME,
  End: TestKey.END,
  Enter: TestKey.ENTER,
} as const;

/** Harness for `ui-resize-handle`: reads its value and limits, presses keys on it. */
export class UiResizeHandleHarness extends ComponentHarness {
  static hostSelector = 'ui-resize-handle';

  private readonly separator = this.locatorFor('[role="separator"]');

  /** The accessible name. */
  async label(): Promise<string | null> {
    return (await this.separator()).getAttribute('aria-label');
  }

  /** The value in px (the width of the pane before the handle). */
  async getValue(): Promise<number> {
    return Number(await (await this.separator()).getAttribute('aria-valuenow'));
  }

  /** The limits in px. */
  async getLimits(): Promise<{ min: number; max: number }> {
    const separator = await this.separator();
    return {
      min: Number(await separator.getAttribute('aria-valuemin')),
      max: Number(await separator.getAttribute('aria-valuemax')),
    };
  }

  /** Presses an arrow, Home, End or Enter on the handle; `shift` for the large step. */
  async pressKey(key: keyof typeof KEYS, options: { shift?: boolean } = {}): Promise<void> {
    const separator = await this.separator();
    await separator.sendKeys(options.shift ? { shift: true } : {}, KEYS[key]);
  }

  /** A double click: asks the owner to reset. */
  async doubleClick(): Promise<void> {
    await (await this.separator()).dispatchEvent('dblclick');
  }
}
