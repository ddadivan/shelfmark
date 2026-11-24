import { Injector } from '@angular/core';
import { ASK_DEPTH, ASK_HISTORY_LIMIT } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MockAskHistory } from './mock-ask-history';
import { MockAskHistoryApi } from './mock-ask-history.api';

function setup() {
  const injector = Injector.create({
    providers: [MockLibraryData, MockAskHistory, MockAskHistoryApi],
  });
  return {
    history: injector.get(MockAskHistory),
    api: injector.get(MockAskHistoryApi),
    library: injector.get(MockLibraryData),
  };
}

const record = (question: string, links: { n: number; id: string }[] = []) => ({
  turn: { question, answer: 'An answer [1].', links },
  steps: [],
  cards: [{ n: [1], total: null, search: null }],
  notFound: false,
  truncated: false,
  depth: ASK_DEPTH.Quick,
});

describe('MockAskHistory', () => {
  it('starts with the seeded conversations, newest first, and pages them', () => {
    const { history } = setup();
    const page = history.list(undefined, 2);
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).not.toBeNull();
    const next = history.list(page.nextCursor ?? undefined, 10);
    expect(next.items).toHaveLength(3);
    expect(next.nextCursor).toBeNull();
  });

  it('appends turns, reads links live by id and drops ones that are gone', () => {
    const { history, library } = setup();
    const link = library.links[0];
    const id = history.append(null, record('Which coat?', link ? [{ n: 1, id: link.id }] : []));
    history.append(id, record('The first one?'));
    expect(history.list().items[0]).toMatchObject({ id, title: 'Which coat?', turns: 2 });
    expect(history.turns(id)?.map((turn) => turn.question)).toEqual([
      'Which coat?',
      'The first one?',
    ]);
    const read = history.get(id);
    expect(read?.turns[0]?.sources.map((source) => source.link.id)).toEqual([link?.id]);
    expect(read?.turns[0]?.cards[0]?.items).toHaveLength(1);
    library.links = library.links.filter((candidate) => candidate.id !== link?.id);
    expect(history.get(id)?.turns[0]?.sources).toEqual([]);
    expect(history.get('nope')).toBeNull();
    expect(history.turns('nope')).toBeNull();
  });

  it('keeps at most 50 conversations, dropping the oldest', () => {
    const { history } = setup();
    for (let index = 0; index < ASK_HISTORY_LIMIT.ConversationsMax + 3; index += 1) {
      history.append(null, record(`Question ${index}`));
    }
    expect(history.list(undefined, 100).items).toHaveLength(ASK_HISTORY_LIMIT.ConversationsMax);
  });

  it('serves the API: 404 for an unknown id, delete and clear', async () => {
    const { api, history } = setup();
    const id = history.append(null, record('Which coat?'));
    expect((await firstValueFrom(api.get(id))).title).toBe('Which coat?');
    await expect(firstValueFrom(api.get('nope'))).rejects.toMatchObject({ status: 404 });
    await firstValueFrom(api.remove(id));
    await expect(firstValueFrom(api.remove(id))).rejects.toMatchObject({ status: 404 });
    expect((await firstValueFrom(api.clear())).deleted).toBe(5);
    expect((await firstValueFrom(api.list())).items).toEqual([]);
  });
});
