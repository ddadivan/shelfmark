import { ComponentHarness, TestKey } from '@angular/cdk/testing';

const KEYS = {
  ArrowLeft: TestKey.LEFT_ARROW,
  ArrowRight: TestKey.RIGHT_ARROW,
  Home: TestKey.HOME,
  End: TestKey.END,
} as const;

/**
 * Harness for `ui-drawer`: closes it and, while it is resizable (#521), reads the width the
 * resize handle reports and moves it with the keyboard or resets it with a double click.
 */
export class UiDrawerHarness extends ComponentHarness {
  static hostSelector = 'ui-drawer';

  private readonly handle = this.locatorForOptional('.ui-drawer__resize');
  private readonly closeButton = this.locatorFor('.ui-drawer__head > ui-button button');

  async close(): Promise<void> {
    await (await this.closeButton()).click();
  }

  /** The resize handle shows (resizable and wide enough). */
  async isResizable(): Promise<boolean> {
    return (await this.handle()) !== null;
  }

  /** The accessible name of the resize handle. */
  async getResizeLabel(): Promise<string | null> {
    return (await this.requireHandle()).getAttribute('aria-label');
  }

  /** The width in px and its limits, as the handle reports them. */
  async getSize(): Promise<{ now: number; min: number; max: number }> {
    const handle = await this.requireHandle();
    const read = async (name: string) => Number(await handle.getAttribute(name));
    return {
      now: await read('aria-valuenow'),
      min: await read('aria-valuemin'),
      max: await read('aria-valuemax'),
    };
  }

  /** Presses an arrow, Home or End on the handle. */
  async pressResizeKey(key: keyof typeof KEYS): Promise<void> {
    await (await this.requireHandle()).sendKeys(KEYS[key]);
  }

  /** Double click on the handle: back to the default width. */
  async resetSize(): Promise<void> {
    await (await this.requireHandle()).dispatchEvent('dblclick');
  }

  private async requireHandle() {
    const handle = await this.handle();
    if (handle === null) {
      throw new Error('The drawer is not resizable.');
    }
    return handle;
  }
}
