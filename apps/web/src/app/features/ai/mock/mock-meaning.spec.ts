import { AI_SEARCH_LIMIT, MEANING_REASON_SOURCE, type LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { meaningDoc, meaningStems, rankByMeaning, relatedWhy, searchWhy } from './mock-meaning';

function link(patch: Partial<LinkResponse>): LinkResponse {
  return { ...MOCK_LINKS[0], tags: [], note: null, summary: null, folderId: null, ...patch };
}

const JACKET = link({
  id: 'jacket',
  title: 'Nano Puff jacket',
  tags: ['clothes'],
  summary: 'A light, packable insulated jacket. Keeps warm when wet.',
  folderId: 'f-clothes',
});
const SCARF = link({
  id: 'scarf',
  title: 'Cashmere scarf',
  tags: ['clothes'],
  summary: 'A soft cashmere scarf in a long cut.',
  folderId: 'f-clothes',
});
const SIGNALS = link({
  id: 'signals',
  title: 'Angular signals: the guide',
  tags: ['angular', 'docs'],
  summary: 'Writable signals, computed values and effects.',
  note: 'secret coat words',
});

describe('mock search by meaning', () => {
  it('stems words of 3+ letters, drops stop words and merges synonyms', () => {
    expect([...meaningStems('Talk about the Signals and rendering')]).toEqual([
      'signal',
      'performance',
    ]);
    expect(meaningStems('coat')).toEqual(meaningStems('jackets'));
    expect(meaningStems('ramen')).toEqual(meaningStems('noodles'));
    expect(meaningStems('a an of').size).toBe(0);
  });

  it('embeds title, tags and summary, the note only with includeNotes, never the URL', () => {
    const plain = meaningDoc(SIGNALS, null, false);
    expect(plain.stems.has('coat')).toBe(false);
    expect(plain.stems.has('angular.dev')).toBe(false);
    expect(plain.stems.has('docs') || plain.stems.has('doc')).toBe(true);
    expect(meaningDoc(SIGNALS, null, true).stems.has('jacket')).toBe(true);
  });

  it('ranks the closest links first, above the floor and within the window of the best', () => {
    const docs = [JACKET, SCARF, SIGNALS].map((item) => meaningDoc(item, 'Clothes', false));
    const ranked = rankByMeaning(meaningStems('warm coat'), docs, 3);
    expect(ranked.map((item) => item.doc.link.id)).toEqual(['jacket']);
    expect(rankByMeaning(meaningStems('the and'), docs, 3)).toEqual([]);
    expect(rankByMeaning(meaningStems('clothes'), docs, 1)).toHaveLength(1);
  });

  it('explains a search match by tags, folder and summary clauses, at most two, cut', () => {
    const doc = meaningDoc(JACKET, 'Clothes', false);
    expect(searchWhy(doc, meaningStems('warm clothes'))).toEqual([
      { source: MEANING_REASON_SOURCE.Tag, text: 'clothes' },
      { source: MEANING_REASON_SOURCE.Folder, text: 'Clothes' },
    ]);
    expect(searchWhy(doc, meaningStems('winter'))).toEqual([
      { source: MEANING_REASON_SOURCE.Summary, text: 'packable insulated jacket' },
      { source: MEANING_REASON_SOURCE.Summary, text: 'Keeps warm when wet' },
    ]);
    const long = meaningDoc(link({ summary: `${'word '.repeat(40)}winter` }), null, false);
    const [reason] = searchWhy(long, meaningStems('winter'));
    expect(reason.text.length).toBeLessThanOrEqual(AI_SEARCH_LIMIT.WhyTextMax);
    expect(reason.text.endsWith('…')).toBe(true);
  });

  it('falls back to the tags, then the folder, then the first summary clause', () => {
    const none = meaningStems('zebra');
    expect(searchWhy(meaningDoc(JACKET, 'Clothes', false), none)[0].source).toBe(
      MEANING_REASON_SOURCE.Tag,
    );
    const noTags = link({ summary: 'First part. Second part.' });
    expect(searchWhy(meaningDoc(noTags, 'Reading', false), none)).toEqual([
      { source: MEANING_REASON_SOURCE.Folder, text: 'Reading' },
    ]);
    expect(searchWhy(meaningDoc(noTags, null, false), none)).toEqual([
      { source: MEANING_REASON_SOURCE.Summary, text: 'First part' },
    ]);
    expect(searchWhy(meaningDoc(link({}), null, false), none)).toEqual([]);
  });

  it('explains a related link by shared tags, then the same folder', () => {
    const source = meaningDoc(JACKET, 'Clothes', false);
    expect(relatedWhy(meaningDoc(SCARF, 'Clothes', false), source)).toEqual([
      { source: MEANING_REASON_SOURCE.Tag, text: 'clothes' },
      { source: MEANING_REASON_SOURCE.Folder, text: 'Clothes' },
    ]);
  });
});
