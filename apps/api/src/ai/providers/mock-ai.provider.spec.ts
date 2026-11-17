import { MockAiProvider } from './mock-ai.provider';
import type { LinkJobInput } from '../models/link-job-input.interface';

const input = (overrides: Partial<LinkJobInput> = {}): LinkJobInput => ({
  parts: ['tags', 'folder', 'summary'],
  language: 'en',
  url: 'https://www.example.com/css-grid-guide',
  title: 'A CSS grid guide',
  description: null,
  note: null,
  excerpt: null,
  tags: ['css', 'cooking', 'ui'],
  folders: [
    { key: 'f1', path: 'Recipes' },
    { key: 'f2', path: 'Work / Design' },
  ],
  examples: [],
  ...overrides,
});

describe('MockAiProvider', () => {
  const provider = new MockAiProvider();

  it('answers deterministically from the link and the user vocabulary', async () => {
    const first = await provider.runLinkJob(input());
    expect(first).toEqual(await provider.runLinkJob(input()));
    expect(first).toEqual({
      type: 'output',
      output: {
        tags: ['css'],
        newTag: 'example',
        folder: null,
        summary: 'A page about A CSS grid guide.',
        kind: 'article',
      },
    });
  });

  it('picks the first folder the link mentions and marks video hosts', async () => {
    const outcome = await provider.runLinkJob(
      input({ url: 'https://youtube.com/watch?v=1', title: 'Design basics' }),
    );
    expect(outcome).toMatchObject({
      type: 'output',
      output: { folder: 'f2', kind: 'video', newTag: 'youtube' },
    });
  });

  it('answers only the parts that were asked for', async () => {
    const outcome = await provider.runLinkJob(input({ parts: ['summary'] }));
    expect(outcome).toMatchObject({
      output: { tags: [], newTag: null, folder: null, summary: expect.any(String) },
    });
    const none = await provider.runLinkJob(input({ parts: ['tags'], title: null }));
    expect(none).toMatchObject({ output: { summary: null } });
  });

  it('does not repeat an existing tag as the new tag', async () => {
    const outcome = await provider.runLinkJob(input({ tags: ['example'] }));
    expect(outcome).toMatchObject({ output: { newTag: null } });
  });

  it('simulates a refusal and an outage from the URL', async () => {
    expect(await provider.runLinkJob(input({ url: 'https://x.test/ai-refuse' }))).toEqual({
      type: 'refusal',
    });
    expect(await provider.runLinkJob(input({ url: 'https://x.test/ai-fail' }))).toEqual({
      type: 'error',
      retryable: true,
    });
  });

  it('handles an unparsable URL and a link without a title', async () => {
    const outcome = await provider.runLinkJob(input({ url: 'not a url', title: null }));
    expect(outcome).toMatchObject({
      type: 'output',
      output: { summary: 'A page about not a url.' },
    });
  });

  it('answers a batch as completed at once and holds no state', async () => {
    const submission = await provider.submitLinkBatch([
      { customId: 'a', input: input() },
      { customId: 'b', input: input({ url: 'https://x.test/ai-refuse' }) },
      { customId: 'c', input: input({ url: 'https://x.test/ai-fail' }) },
    ]);
    expect(submission.providerBatchId).toMatch(/^mock-batch-/);
    expect(submission.completed?.map((item) => [item.customId, item.outcome.type])).toEqual([
      ['a', 'output'],
      ['b', 'refusal'],
      ['c', 'error'],
    ]);
    expect(await provider.getLinkBatchStatus()).toBe('ended');
    expect(await provider.readLinkBatchResults()).toEqual([]);
    await expect(provider.cancelLinkBatch()).resolves.toBeUndefined();
  });
});
