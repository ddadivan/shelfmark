import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';
import type { StreamingAnswerHarnessFilters } from './models/streaming-answer-harness-filters.interface';

/**
 * Harness for `ui-streaming-answer`: reads the question, the answer text, the citations, whether it
 * still streams, the status pill and what the live region announces; clicks a citation.
 */
export class UiStreamingAnswerHarness extends ComponentHarness {
  static hostSelector = 'ui-streaming-answer';

  static with(
    options: StreamingAnswerHarnessFilters = {},
  ): HarnessPredicate<UiStreamingAnswerHarness> {
    return new HarnessPredicate(UiStreamingAnswerHarness, options).addOption(
      'question',
      options.question,
      (harness, question) => HarnessPredicate.stringMatches(harness.getQuestion(), question),
    );
  }

  private readonly bubble = this.locatorFor('.ui-streaming-answer__bubble');
  private readonly answer = this.locatorForOptional('.ui-streaming-answer__text');
  private readonly cites = this.locatorForAll('.ui-streaming-answer__cite');
  private readonly caret = this.locatorForOptional('.ui-streaming-answer__caret');
  private readonly disclaimerLine = this.locatorForOptional('.ui-streaming-answer__disclaimer');
  private readonly live = this.locatorFor('.ui-streaming-answer__live');
  private readonly pill = this.locatorForOptional('.ui-streaming-answer__step--now');
  private readonly doneSteps = this.locatorForAll(
    '.ui-streaming-answer__step:not(.ui-streaming-answer__step--now)',
  );

  async getQuestion(): Promise<string> {
    return (await (await this.bubble()).text()).trim();
  }

  /** The answer as shown, citation numbers included; empty before any text. */
  async getAnswerText(): Promise<string> {
    const answer = await this.answer();
    return answer ? (await answer.text()).trim() : '';
  }

  /** The accessible names of the citation buttons in reading order ("Source 1"). */
  async getCitationLabels(): Promise<(string | null)[]> {
    return Promise.all((await this.cites()).map((cite) => cite.getAttribute('aria-label')));
  }

  /** Whether the citation at `index` (0-based, reading order) is disabled. */
  async isCitationDisabled(index: number): Promise<boolean> {
    const cite = (await this.cites())[index];
    if (!cite) {
      throw new Error(`No citation at index ${index}.`);
    }
    return (await cite.getProperty<boolean>('disabled')) === true;
  }

  /** Clicks the citation at `index` (0-based, reading order). */
  async clickCitation(index: number): Promise<void> {
    const cite = (await this.cites())[index];
    if (!cite) {
      throw new Error(`No citation at index ${index}.`);
    }
    await cite.click();
  }

  /** The caret or the status line shows: the answer is still arriving. */
  async isStreaming(): Promise<boolean> {
    return (await this.caret()) !== null || (await this.pill()) !== null;
  }

  /** The status line's text ("Searching your links…"), or `null` when none shows. */
  async getStatus(): Promise<string | null> {
    const pill = await this.pill();
    return pill ? (await pill.text()).trim() : null;
  }

  /** The finished steps above the answer ("Searched your links · 9 found"). */
  async getSteps(): Promise<string[]> {
    return Promise.all((await this.doneSteps()).map(async (step) => (await step.text()).trim()));
  }

  /** The disclaimer line, or `null` while streaming or before any text. */
  async getDisclaimer(): Promise<string | null> {
    const line = await this.disclaimerLine();
    return line ? (await line.text()).trim() : null;
  }

  /** What the polite live region holds: the whole answer once complete, else empty. */
  async getAnnouncement(): Promise<string> {
    return (await (await this.live()).text()).trim();
  }
}
