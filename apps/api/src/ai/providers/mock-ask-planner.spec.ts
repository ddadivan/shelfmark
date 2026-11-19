import { ASK_MODEL_PROFILE } from '../models/ask-model-profile.const';
import type { AskMessage } from '../models/ask-message.type';
import type { AskRoundChunk } from '../models/ask-round-chunk.type';
import type { AskRoundInput } from '../models/ask-round-input.interface';
import { MockAiProvider } from './mock-ai.provider';
import { mockMonthRange, mockTopic, planMockAskRound } from './mock-ask-planner';

const ask = (question: string, history = ''): AskMessage => ({
  role: 'user',
  content: [
    { type: 'text', text: `${history}<today>2026-11-19</today>\n<question>${question}</question>` },
  ],
});

const round = (messages: AskMessage[], overrides: Partial<AskRoundInput> = {}): AskRoundInput => ({
  profile: ASK_MODEL_PROFILE.Quick,
  system: '',
  tools: [],
  messages,
  historyEnd: null,
  toolChoice: 'auto',
  timeoutMs: 8000,
  ...overrides,
});

const called = (name: string, input: unknown, id = 'c1'): AskMessage => ({
  role: 'assistant',
  content: [{ type: 'tool_call', id, name, input }],
});
const result = (data: unknown, id = 'c1', isError = false): AskMessage => ({
  role: 'user',
  content: [
    {
      type: 'tool_result',
      toolCallId: id,
      content: typeof data === 'string' ? data : JSON.stringify(data),
      isError,
    },
  ],
});
const ITEMS = {
  total: 14,
  hasMore: true,
  items: [
    {
      ref: 1,
      title: 'Angular Signals guide',
      site: 'angular.dev/guide',
      tags: ['angular'],
      summary: 'Signals.',
    },
    { ref: 2, title: 'Signals in practice', site: 'blog.dev/x', tags: [], summary: null },
  ],
};

describe('mock Ask planner (ADR 0055 point 10)', () => {
  it('reads topics and month ranges', () => {
    expect(mockTopic('find the signals article i saved in october')).toBe('signal');
    expect(mockTopic('how many links do i have?')).toBe('');
    expect(mockMonthRange('saved in october', '2026-11-19')).toEqual({
      savedFrom: '2026-10-01',
      savedTo: '2026-10-31',
    });
    expect(mockMonthRange('saved in december', '2026-11-19')).toEqual({
      savedFrom: '2025-12-01',
      savedTo: '2025-12-31',
    });
    expect(mockMonthRange('saved in february', '2028-03-01')['savedTo']).toBe('2028-02-29');
  });

  it('counts with a group, then answers with the number', () => {
    const first = planMockAskRound(round([ask('how many links about angular by month?')]));
    expect(first).toMatchObject({
      kind: 'reply',
      text: '',
      calls: [{ name: 'count_links', input: { query: 'angular', groupBy: 'month' } }],
    });
    const second = planMockAskRound(
      round([
        ask('how many links about angular by month?'),
        called('count_links', {}),
        result({ total: 7, groups: [{ label: '2026-10', count: 4 }] }),
      ]),
    );
    expect(second).toMatchObject({
      kind: 'reply',
      text: 'You have 7 links about angular. Most are in 2026-10 (4).',
      calls: [],
    });
  });

  it('finds with a month, shows cards with a lead sentence, then closes', () => {
    const q = 'find the signals article i saved in october';
    expect(planMockAskRound(round([ask(q)]))).toMatchObject({
      calls: [
        {
          name: 'search_links',
          input: { query: 'signal', savedFrom: '2026-10-01', savedTo: '2026-10-31' },
        },
      ],
    });
    const cards = planMockAskRound(round([ask(q), called('search_links', {}), result(ITEMS)]));
    expect(cards).toMatchObject({
      text: 'I found 14 links about signal. ',
      calls: [{ name: 'show_links', input: { refs: [1, 2] } }],
    });
    const close = planMockAskRound(
      round([
        ask(q),
        called('search_links', {}),
        result(ITEMS),
        called('show_links', {}, 'c2'),
        result({ shown: 2 }, 'c2'),
      ]),
    );
    expect(close).toMatchObject({ text: '', calls: [] });
  });

  it('follows up: "more" searches with an offset, "the first one" reads the first history ref', () => {
    const history = '<question>find signals</question>';
    const shown = '<shown_links><link ref="3">{}</link><link ref="5">{}</link></shown_links>\n';
    const messages = (q: string): AskMessage[] => [
      { role: 'user', content: [{ type: 'text', text: history }] },
      { role: 'assistant', content: [{ type: 'text', text: 'I found 2 links [1] [2].' }] },
      ask(q, shown),
    ];
    expect(planMockAskRound(round(messages('what else?')))).toMatchObject({
      calls: [{ name: 'search_links', input: { query: 'signal', offset: 2 } }],
    });
    expect(planMockAskRound(round(messages('open the first one')))).toMatchObject({
      calls: [{ name: 'get_link', input: { ref: 3 } }],
    });
  });

  it('escalates comparisons on the quick profile only, and not after the escalation was refused', () => {
    expect(planMockAskRound(round([ask('compare my signals links')]))).toMatchObject({
      calls: [{ name: 'request_deeper_answer', input: { reason: 'synthesis' } }],
    });
    expect(
      planMockAskRound(
        round([ask('compare my signals links')], { profile: ASK_MODEL_PROFILE.Deep }),
      ),
    ).toMatchObject({
      calls: [{ name: 'search_links' }],
    });
    const refused = planMockAskRound(
      round([
        ask('compare my signals links'),
        called('request_deeper_answer', {}),
        result('not available', 'c1', true),
      ]),
    );
    expect(refused).toMatchObject({ calls: [{ name: 'search_links' }] });
    const deepAnswer = planMockAskRound(
      round([ask('compare my signals links'), called('search_links', {}), result(ITEMS)], {
        profile: ASK_MODEL_PROFILE.Deep,
      }),
    );
    expect(deepAnswer).toMatchObject({ kind: 'reply', calls: [] });
    if (deepAnswer.kind === 'reply') expect(deepAnswer.text).toContain('Looking closer');
  });

  it('answers from what it has when forced, and says when nothing was found', () => {
    expect(
      planMockAskRound(
        round([
          ask('sourdough starter tips'),
          called('search_links', {}),
          result({ total: 0, hasMore: false, items: [] }),
        ]),
      ),
    ).toMatchObject({
      text: "I couldn't find anything about this in your links.",
    });
    expect(
      planMockAskRound(
        round([ask('ai-loop please'), called('search_links', {}), result(ITEMS)], {
          toolChoice: 'none',
        }),
      ),
    ).toMatchObject({
      calls: [],
    });
    expect(planMockAskRound(round([ask('ai-loop please')]))).toMatchObject({
      calls: [{ name: 'search_links' }],
    });
  });

  it('has triggers for failures, bad arguments, late escalation and injected text', () => {
    expect(planMockAskRound(round([ask('ai-fail now')]))).toEqual({ kind: 'fail' });
    expect(planMockAskRound(round([ask('ai-refuse now')]))).toEqual({ kind: 'refuse' });
    expect(planMockAskRound(round([ask('ai-slow signals')]))).toMatchObject({ slow: true });
    expect(planMockAskRound(round([ask('ai-bad-args signals')]))).toMatchObject({
      calls: [{ name: 'search_links', input: { query: 'x', userId: 'everyone' } }],
    });
    expect(
      planMockAskRound(
        round([
          ask('ai-bad-args signals'),
          called('search_links', {}),
          result('Unknown argument', 'c1', true),
        ]),
      ),
    ).toMatchObject({ calls: [{ name: 'search_links', input: { query: 'signal' } }] });
    expect(planMockAskRound(round([ask('ai-deep-late signals')]))).toMatchObject({
      text: 'Let me look. ',
      calls: [{ name: 'request_deeper_answer' }],
    });
    const injected = planMockAskRound(
      round([ask('ai-inject signals'), called('search_links', {}), result(ITEMS)]),
    );
    if (injected.kind === 'reply') expect(injected.text).toContain('[999]');
  });
});

describe('MockAiProvider.askRound', () => {
  const instant = () => Promise.resolve();
  const collect = async (provider: MockAiProvider, input: AskRoundInput) => {
    const chunks: AskRoundChunk[] = [];
    for await (const chunk of provider.askRound(input, new AbortController().signal))
      chunks.push(chunk);
    return chunks;
  };

  it('streams words, then tool starts, then the blocks', async () => {
    const chunks = await collect(
      new MockAiProvider(instant, 0),
      round([ask('find signals'), called('search_links', {}), result(ITEMS)]),
    );
    expect(
      chunks.filter((c) => c.type === 'text').map((c) => (c.type === 'text' ? c.text : '')),
    ).toEqual(['I ', 'found ', '14 ', 'links ', 'about ', 'signal. ']);
    expect(chunks.at(-2)).toEqual({ type: 'tool_start', name: 'show_links' });
    expect(chunks.at(-1)).toMatchObject({ type: 'end', stopReason: 'tool-use' });
  });

  it('fails, refuses and cuts', async () => {
    const provider = new MockAiProvider(instant, 0);
    expect(await collect(provider, round([ask('ai-fail')]))).toEqual([
      { type: 'error', retryable: true },
    ]);
    expect(await collect(provider, round([ask('ai-refuse')]))).toMatchObject([
      { type: 'end', stopReason: 'refusal' },
    ]);
    const cut = await collect(
      provider,
      round([ask('ai-cut signals'), called('search_links', {}), result(ITEMS)]),
    );
    expect(cut.filter((c) => c.type === 'text')).toHaveLength(2);
    expect(cut.at(-1)).toEqual({ type: 'error', retryable: true });
  });
});
