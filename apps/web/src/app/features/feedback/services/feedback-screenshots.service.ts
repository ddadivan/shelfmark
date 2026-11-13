import { computed, Service, signal } from '@angular/core';
import { FEEDBACK_MESSAGE_LIMIT, type FeedbackScreenshotUpload } from '@shelfmark/contracts';
import { FEEDBACK_SCREENSHOT_ERROR } from '../models/feedback-screenshot-error.const';
import type { FeedbackScreenshotAttachment } from '../models/feedback-screenshot-attachment.interface';
import type { FeedbackScreenshotError } from '../models/feedback-screenshot-error.type';
import { readFeedbackScreenshot } from '../utils/read-feedback-screenshot';

/**
 * The screenshots chosen in one "Send feedback" dialog (#352): up to
 * `FEEDBACK_MESSAGE_LIMIT.ScreenshotsMax`, in the order they were added. `add()` takes the files
 * of a pick or a drop, checks each one in the browser and keeps the valid ones while there is
 * room; the first problem (or "too many") is what the form shows. Provided by the dialog, so each
 * dialog starts empty.
 */
@Service()
export class FeedbackScreenshots {
  readonly max = FEEDBACK_MESSAGE_LIMIT.ScreenshotsMax;

  private readonly attached = signal<readonly FeedbackScreenshotAttachment[]>([]);
  private readonly problem = signal<FeedbackScreenshotError | null>(null);
  private readonly reading = signal(0);

  /** The chosen screenshots, in order. */
  readonly items = this.attached.asReadonly();
  /** Why the last pick or drop was not (fully) taken, or `null`. */
  readonly error = this.problem.asReadonly();
  /** True while there is room for another screenshot. */
  readonly canAdd = computed(() => this.attached().length + this.reading() < this.max);
  /** What the store sends, in order. */
  readonly uploads = computed<FeedbackScreenshotUpload[]>(() =>
    this.attached().map((item) => item.upload),
  );

  /** Reads and checks `files` (a pick or a drop) and adds the valid ones while there is room. */
  async add(files: readonly File[]): Promise<void> {
    if (files.length === 0) {
      return;
    }
    const room = this.max - this.attached().length - this.reading();
    const taken = files.slice(0, Math.max(0, room));
    let problem: FeedbackScreenshotError | null =
      files.length > taken.length ? FEEDBACK_SCREENSHOT_ERROR.Count : null;
    this.reading.update((count) => count + taken.length);
    const results = await Promise.all(taken.map((file) => readFeedbackScreenshot(file)));
    this.reading.update((count) => count - taken.length);
    const valid: FeedbackScreenshotAttachment[] = [];
    for (const result of results) {
      if (typeof result === 'string') {
        problem ??= result;
      } else {
        valid.push(result);
      }
    }
    this.attached.update((items) => [...items, ...valid].slice(0, this.max));
    this.problem.set(problem);
  }

  /** Removes the screenshot at `index` and clears the last problem. */
  remove(index: number): void {
    this.attached.update((items) => items.filter((_, at) => at !== index));
    this.problem.set(null);
  }
}
