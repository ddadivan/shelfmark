import {
  FEEDBACK_MESSAGE_KIND,
  FEEDBACK_MESSAGE_LIMIT,
  FEEDBACK_SCREENSHOT_ERROR_MESSAGE,
  FEEDBACK_STATUS,
  feedbackScreenshotsPath,
  type FeedbackScreenshotUpload,
} from '@shelfmark/contracts';
import type { ContractScenario } from '../models/contract-scenario.interface';
import { ANY } from '../support/any.const';
import { expectEqual } from '../support/expect-equal';
import { expectError } from '../support/expect-error';
import { scenario } from '../support/scenario';

/** A tiny PNG (the 8-byte signature and padding) as base64, valid for both runners. */
const PNG: FeedbackScreenshotUpload = {
  type: 'image/png',
  data: 'iVBORw0KGgoAAAAAAAAAAA==',
};

export const FEEDBACK_SCENARIOS: readonly ContractScenario[] = [
  scenario('feedback', 'a new account has sent no messages', async ({ feedback }) => {
    expectEqual(await feedback.list(), []);
  }),

  scenario(
    'feedback',
    'sends a trimmed message that is received without a reply',
    async ({ feedback }) => {
      const sent = await feedback.send({
        kind: FEEDBACK_MESSAGE_KIND.Idea,
        text: '  Sort by last opened  ',
      });
      expectEqual(sent, {
        id: ANY.id,
        kind: FEEDBACK_MESSAGE_KIND.Idea,
        text: 'Sort by last opened',
        status: FEEDBACK_STATUS.Received,
        reply: null,
        screenshotUrls: [],
        createdAt: ANY.time,
        updatedAt: ANY.time,
      });
      expectEqual(await feedback.list(), [sent]);
    },
  ),

  scenario('feedback', 'lists the newest message first', async ({ feedback }) => {
    await feedback.send({ kind: FEEDBACK_MESSAGE_KIND.Idea, text: 'first' });
    await feedback.send({ kind: FEEDBACK_MESSAGE_KIND.Problem, text: 'second' });
    expectEqual(
      (await feedback.list()).map((message) => message.text),
      ['second', 'first'],
    );
  }),

  scenario(
    'feedback',
    'rejects an empty, too long or unknown-kind message',
    async ({ feedback }) => {
      const rejected = { status: 400 };
      await expectError(
        feedback.send({ kind: FEEDBACK_MESSAGE_KIND.Idea, text: '   ' }),
        rejected,
        'blank text',
      );
      await expectError(
        feedback.send({
          kind: FEEDBACK_MESSAGE_KIND.Idea,
          text: 'x'.repeat(FEEDBACK_MESSAGE_LIMIT.TextMax + 1),
        }),
        rejected,
        'long text',
      );
      await expectError(
        feedback.send({ kind: 'rant' as never, text: 'hello' }),
        rejected,
        'unknown kind',
      );
      expectEqual(await feedback.list(), []);
    },
  ),

  scenario('feedback', 'answers 429 once the hourly limit is used up', async ({ feedback }) => {
    for (let index = 0; index < FEEDBACK_MESSAGE_LIMIT.PerHourMax; index++) {
      await feedback.send({ kind: FEEDBACK_MESSAGE_KIND.Other, text: `message ${index}` });
    }
    await expectError(
      feedback.send({ kind: FEEDBACK_MESSAGE_KIND.Other, text: 'one too many' }),
      { status: 429 },
      'send past the hourly limit',
    );
  }),

  scenario(
    'feedback',
    'attaches up to three screenshots in order and refuses a fourth',
    async ({ feedback }) => {
      const sent = await feedback.send({ kind: FEEDBACK_MESSAGE_KIND.Problem, text: 'broken' });
      let last = sent;
      for (let index = 0; index < FEEDBACK_MESSAGE_LIMIT.ScreenshotsMax; index++) {
        last = await feedback.attachScreenshot(sent.id, PNG);
      }
      expectEqual(
        last.screenshotUrls,
        [0, 1, 2].map((position) => `${feedbackScreenshotsPath(sent.id)}/${position}`),
      );
      await expectError(
        feedback.attachScreenshot(sent.id, PNG),
        { status: 400, code: FEEDBACK_SCREENSHOT_ERROR_MESSAGE.TooMany },
        'fourth screenshot',
      );
      expectEqual((await feedback.list())[0]?.screenshotUrls, last.screenshotUrls);
    },
  ),

  scenario(
    'feedback',
    'refuses a screenshot of the wrong type or for a missing message',
    async ({ feedback }) => {
      const sent = await feedback.send({ kind: FEEDBACK_MESSAGE_KIND.Problem, text: 'broken' });
      await expectError(
        feedback.attachScreenshot(sent.id, { type: 'image/gif' as never, data: PNG.data }),
        { status: 400 },
        'gif type',
      );
      await expectError(
        feedback.attachScreenshot('0198f6a0-0000-7000-8000-000000000000', PNG),
        { status: 404 },
        'missing message',
      );
      expectEqual((await feedback.list())[0]?.screenshotUrls, []);
    },
  ),
];
