import type { Locator, Page } from '@playwright/test';
import { PROMO_CHAPTER_START_MS } from '../models/promo-chapter.const';
import type { PromoChapter } from '../models/promo-chapter.type';
import type { PromoCut } from '../models/promo-cut.interface';
import { PROMO_DEVICE } from '../models/promo-device.const';

/** Screenshot CSS that leaves the recording pointer out of the poster. */
export const HIDE_CURSOR_CSS = '[data-promo-cursor] { visibility: hidden !important; }';

/** Pointer steps of a glide: about 0.3 s at 60 Hz, slow enough to follow. */
const GLIDE_STEPS = 18;
/** Delay between typed characters, human-paced. */
const TYPE_DELAY_MS = 50;
const BEFORE_PRESS_MS = 150;
/**
 * The recording's clock and the page's differ by a frame or two: a cut starts this much before
 * its action (the old page, still) and ends this much after it.
 */
const CUT_MARGIN_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Draws a pointer for the recording only (it never ships in the app): a dot that follows the
 * mouse and pulses on press, or a tap ripple on touch. It is a manual popover, so it sits in the
 * top layer like the app's dialogs and menus, and is re-shown whenever another popover opens so
 * it stays in front. Styles go through the CSSOM, which the CSP allows. A string script: this
 * project has no DOM lib, and the code runs in the browser anyway (see `src/support/settled.ts`).
 */
function cursorScript(touch: boolean): string {
  return `(() => {
  const touch = ${touch};
  const install = () => {
    const dot = document.createElement('div');
    dot.setAttribute('popover', 'manual');
    dot.setAttribute('aria-hidden', 'true');
    dot.setAttribute('data-promo-cursor', '');
    const size = touch ? 44 : 22;
    const css = {
      position: 'fixed',
      inset: 'auto',
      left: '0',
      top: '0',
      width: size + 'px',
      height: size + 'px',
      margin: '0',
      padding: '0',
      border: '0',
      'border-radius': '50%',
      background: touch ? 'rgba(120, 160, 110, 0.45)' : 'rgba(30, 30, 30, 0.55)',
      'box-shadow': '0 0 0 2px rgba(255, 255, 255, 0.9), 0 2px 8px rgba(0, 0, 0, 0.3)',
      'pointer-events': 'none',
      overflow: 'visible',
      opacity: touch ? '0' : '1',
      transform: 'translate(-100px, -100px)',
      transition: 'opacity 300ms ease-out, scale 120ms ease-out',
    };
    Object.entries(css).forEach(([name, value]) => dot.style.setProperty(name, value));
    document.body.append(dot);

    const raise = () => {
      try {
        if (dot.matches(':popover-open')) {
          dot.hidePopover();
        }
        dot.showPopover();
      } catch {
        // No Popover API: the dot still draws, maybe below a dialog.
      }
    };
    raise();
    document.addEventListener(
      'toggle',
      (event) => {
        if (event.target !== dot && event.newState === 'open') {
          queueMicrotask(raise);
        }
      },
      true,
    );
    new MutationObserver(() => {
      if (!dot.isConnected) {
        document.body.append(dot);
        raise();
      }
    }).observe(document.body, { childList: true });

    const moveTo = (event) => {
      const x = event.clientX - size / 2;
      const y = event.clientY - size / 2;
      dot.style.setProperty('transform', 'translate(' + x + 'px, ' + y + 'px)');
    };
    window.addEventListener('pointermove', moveTo, true);
    window.addEventListener(
      'pointerdown',
      (event) => {
        moveTo(event);
        dot.style.setProperty('scale', touch ? '1' : '0.7');
        dot.style.setProperty('opacity', '1');
      },
      true,
    );
    window.addEventListener(
      'pointerup',
      () => {
        dot.style.setProperty('scale', '1');
        if (touch) {
          dot.style.setProperty('opacity', '0');
        }
      },
      true,
    );
  };
  if (document.body) {
    install();
  } else {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  }
})();`;
}

/**
 * Paces the promo recording: slow pointer glides (or taps on the phone), typing with a delay,
 * pauses, and holds until a chapter starts. Time is measured from `start()`, the first frame
 * the final video keeps.
 */
export class PromoDirector {
  private startedAt = Date.now();
  private readonly gaps: PromoCut[] = [];

  constructor(
    private readonly page: Page,
    private readonly phone: boolean,
  ) {}

  /** Adds the recording pointer to every page of the context. */
  static async installCursor(page: Page, touch: boolean): Promise<void> {
    await page.addInitScript({ content: cursorScript(touch) });
  }

  start(): void {
    this.startedAt = Date.now();
  }

  /** Milliseconds of the final video so far: the time since `start()` without the cuts. */
  elapsed(): number {
    return this.raw() - this.gaps.reduce((sum, gap) => sum + gap.end - gap.start, 0);
  }

  /** Milliseconds of the raw recording since `start()`. */
  raw(): number {
    return Date.now() - this.startedAt;
  }

  /** The stretches of the raw recording the encoder leaves out, in order. */
  cuts(): readonly PromoCut[] {
    return this.gaps;
  }

  /**
   * Runs a page load that the video must not show (#330: a reload paints a blank page for a
   * moment): everything recorded while `action` runs, with a short margin on both sides, is cut
   * from the final video, and the captions and chapters after it move up.
   */
  async cut(action: () => Promise<void>): Promise<void> {
    const start = Math.max(0, this.raw() - CUT_MARGIN_MS);
    await action();
    await sleep(CUT_MARGIN_MS);
    this.gaps.push({ start, end: this.raw() });
  }

  pause(ms: number): Promise<void> {
    return sleep(ms);
  }

  /**
   * Holds the current frame until the chapter starts; returns the measured start. With
   * `PROMO_MEASURE=1` it never waits, so a run reports where each chapter would start on its own.
   */
  async holdUntil(chapter: PromoChapter): Promise<number> {
    const device = this.phone ? PROMO_DEVICE.Phone : PROMO_DEVICE.Desktop;
    const wait = PROMO_CHAPTER_START_MS[device][chapter] - this.elapsed();
    if (wait > 0 && !process.env['PROMO_MEASURE']) {
      await sleep(wait);
    }
    return this.elapsed();
  }

  /** Glides the pointer onto the target without pressing it (nothing on the phone). */
  async point(target: Locator): Promise<void> {
    const box = this.phone ? null : await target.boundingBox();
    if (box) {
      await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
        steps: GLIDE_STEPS,
      });
    }
  }

  /** Glides the pointer to the target and clicks it; on the phone, taps it. */
  async press(target: Locator): Promise<void> {
    await this.reveal(target);
    if (this.phone) {
      await sleep(BEFORE_PRESS_MS);
      await target.tap();
      return;
    }
    const box = await target.boundingBox();
    if (box) {
      await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
        steps: GLIDE_STEPS,
      });
    }
    await sleep(BEFORE_PRESS_MS);
    await target.click();
  }

  /**
   * Scrolls the target into view; on the phone into the middle of the screen, so it never sits
   * under the floating tab bar.
   */
  async reveal(target: Locator): Promise<void> {
    await target.scrollIntoViewIfNeeded();
    if (this.phone) {
      await target.evaluate((element) => element.scrollIntoView({ block: 'center' }));
      await sleep(250);
    }
  }

  /** Focuses the field like a person would, then types one character at a time. */
  async type(field: Locator, text: string): Promise<void> {
    await this.press(field);
    await field.pressSequentially(text, { delay: TYPE_DELAY_MS });
  }

  /** Parks the pointer in the empty band beside the page title, so no card shows its hover. */
  async parkPointer(): Promise<void> {
    if (this.phone) {
      return;
    }
    const size = this.page.viewportSize();
    if (size) {
      await this.page.mouse.move(size.width * 0.55, size.height * 0.16, { steps: GLIDE_STEPS });
    }
  }
}
