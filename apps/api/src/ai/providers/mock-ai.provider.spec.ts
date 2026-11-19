import { MockAiProvider } from './mock-ai.provider';
import type { LinkJobInput } from '../models/link-job-input.interface';

const input = (overrides: Partial<LinkJobInput> = {}): LinkJobInput => ({
  parts: ['tags', 'folder', 'summary'],
  wantsTitle: false,
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
        newTags: ['example'],
        moreTags: [],
        folder: null,
        summary: 'A page about A CSS grid guide.',
        title: null,
        kind: 'article',
      },
    });
  });

  it('cleans the title of a draft only when one is wanted', async () => {
    const page = 'Wool coat, straight cut, graphite | COS';
    const wanted = await provider.runLinkJob(input({ title: page, wantsTitle: true }));
    expect(wanted).toMatchObject({
      type: 'output',
      output: { title: 'Wool coat, straight cut, graphite' },
    });
    const unwanted = await provider.runLinkJob(input({ title: page }));
    expect(unwanted).toMatchObject({ type: 'output', output: { title: null } });
  });

  it('picks the first folder the link mentions and marks video hosts', async () => {
    const outcome = await provider.runLinkJob(
      input({ url: 'https://youtube.com/watch?v=1', title: 'Design basics' }),
    );
    expect(outcome).toMatchObject({
      type: 'output',
      output: { folder: 'f2', kind: 'video', newTags: ['youtube', 'design'] },
    });
  });

  it('answers only the parts that were asked for', async () => {
    const outcome = await provider.runLinkJob(input({ parts: ['summary'] }));
    expect(outcome).toMatchObject({
      output: { tags: [], newTags: [], folder: null, summary: expect.any(String) },
    });
    const none = await provider.runLinkJob(input({ parts: ['tags'], title: null }));
    expect(none).toMatchObject({ output: { summary: null } });
  });

  it('does not repeat an existing tag as the new tag', async () => {
    const outcome = await provider.runLinkJob(input({ tags: ['example'] }));
    expect(outcome).toMatchObject({ output: { newTags: [] } });
    const otherCase = await provider.runLinkJob(input({ tags: ['Example'] }));
    expect(otherCase).toMatchObject({ output: { newTags: [] } });
  });

  it('proposes a new tag in lower case', async () => {
    const outcome = await provider.runLinkJob(input({ url: 'https://WWW.GitHub.COM/a/b' }));
    expect(outcome).toMatchObject({ output: { newTags: ['github'] } });
  });

  it('proposes up to two new tags when no existing tag matches, a site name first', async () => {
    const link = input({
      url: 'https://www.example.com/watch',
      title: 'Stand-up comedy special: Hilarious Observations about airports',
      tags: ['cooking'],
    });
    const outcome = await provider.runLinkJob(link);
    expect(outcome).toMatchObject({
      output: { newTags: ['example', 'stand'], moreTags: ['comedy', 'special', 'hilarious'] },
    });
    expect(outcome).toEqual(await provider.runLinkJob(link));
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
