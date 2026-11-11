import type { Locator, Page } from '@playwright/test';
import { PROMO_CHAPTER_START_MS } from '../models/promo-chapter.const';
import type { PromoChapter } from '../models/promo-chapter.type';

/** Pointer steps of a glide: about 0.4 s at 60 Hz, slow enough to follow. */
const GLIDE_STEPS = 24;
/** Delay between typed characters, human-paced. */
const TYPE_DELAY_MS = 70;
const BEFORE_PRESS_MS = 180;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Draws a pointer for the recording only (it never ships in the app): a dot that follows the
 * mouse and pulses on press, or a tap ripple on touch. It is a manual popover, so it sits in the
 * top layer like the app's dialogs and menus, and is re-shown whenever another popover opens so
 * it stays in front. Styles go through the CSSOM, which the CSP allows.
 */
function cursorScript(touch: boolean): void {
  const install = (): void => {
    const dot = document.createElement('div');
    dot.setAttribute('popover', 'manual');
    dot.setAttribute('aria-hidden', 'true');
    const size = touch ? 44 : 22;
    const css: Record<string, string> = {
      position: 'fixed',
      inset: 'auto',
      left: '0',
      top: '0',
      width: `${size}px`,
      height: `${size}px`,
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

    const raise = (): void => {
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
        if (event.target !== dot && (event as ToggleEvent).newState === 'open') {
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

    const moveTo = (event: PointerEvent): void => {
      dot.style.setProperty(
        'transform',
        `translate(${event.clientX - size / 2}px, ${event.clientY - size / 2}px)`,
      );
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
}

/**
 * Paces the promo recording: slow pointer glides (or taps on the phone), typing with a delay,
 * pauses, and holds until a chapter starts. Time is measured from `start()`, the first frame
 * the final video keeps.
 */
export class PromoDirector {
  private startedAt = Date.now();

  constructor(
    private readonly page: Page,
    private readonly phone: boolean,
  ) {}

  /** Adds the recording pointer to every page of the context. */
  static async installCursor(page: Page, touch: boolean): Promise<void> {
    await page.addInitScript(cursorScript, touch);
  }

  start(): void {
    this.startedAt = Date.now();
  }

  /** Milliseconds since `start()`. */
  elapsed(): number {
    return Date.now() - this.startedAt;
  }

  pause(ms: number): Promise<void> {
    return sleep(ms);
  }

  /** Holds the current frame until the chapter starts; returns the measured start. */
  async holdUntil(chapter: PromoChapter): Promise<number> {
    const wait = PROMO_CHAPTER_START_MS[chapter] - this.elapsed();
    if (wait > 0) {
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
    await target.scrollIntoViewIfNeeded();
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

  /** Focuses the field like a person would, then types one character at a time. */
  async type(field: Locator, text: string): Promise<void> {
    await this.press(field);
    await field.pressSequentially(text, { delay: TYPE_DELAY_MS });
  }

  /** Parks the pointer in the middle of the screen, out of the way. */
  async parkPointer(): Promise<void> {
    if (this.phone) {
      return;
    }
    const size = this.page.viewportSize();
    if (size) {
      await this.page.mouse.move(size.width * 0.62, size.height * 0.55, { steps: GLIDE_STEPS });
    }
  }
}
