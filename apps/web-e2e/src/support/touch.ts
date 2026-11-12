import { type CDPSession, type Page } from '@playwright/test';

/** A point on the page, in CSS px of the viewport. */
interface TouchPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * One finger on a touch screen through the Chrome DevTools protocol (`Input.dispatchTouchEvent`):
 * real touch input, so the browser scrolls, fires pointer and touch events and long-press
 * gestures as on a phone. Playwright's `page.touchscreen` only taps. Needs a `hasTouch` context
 * (the phone project) and Chromium.
 */
export class Finger {
  private constructor(
    private readonly page: Page,
    private readonly cdp: CDPSession,
    private at: TouchPoint,
  ) {}

  /** Puts a finger down at `point`. */
  static async down(page: Page, point: TouchPoint): Promise<Finger> {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: point.x, y: point.y }],
    });
    return new Finger(page, cdp, point);
  }

  /** Keeps the finger still for `ms`. */
  async hold(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /** Slides the finger to `point` in `steps` moves, about one frame apart. */
  async move(point: TouchPoint, steps = 10): Promise<void> {
    const from = this.at;
    for (let step = 1; step <= steps; step++) {
      const x = from.x + ((point.x - from.x) * step) / steps;
      const y = from.y + ((point.y - from.y) * step) / steps;
      await this.cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y }],
      });
      await this.page.waitForTimeout(16);
    }
    this.at = point;
  }

  /** Lifts the finger. */
  async up(): Promise<void> {
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await this.cdp.detach();
  }
}
