import { buildEmbeddingText, embeddingTextHash } from './build-embedding-text';

const LINK = {
  title: '  Winter   coat guide ',
  tagNames: ['wear', 'Shopping', 'wear', ' '],
  summary: 'How to pick a warm coat.',
  note: 'Ask about\nsizes',
};

describe('buildEmbeddingText', () => {
  it('writes title, sorted distinct tags and summary as plain lines, without the note by default', () => {
    expect(buildEmbeddingText(LINK, false)).toBe(
      'Title: Winter coat guide\nTags: Shopping, wear\nSummary: How to pick a warm coat.',
    );
  });

  it('adds the note only while "Include my notes" is on', () => {
    expect(buildEmbeddingText(LINK, true)).toBe(
      'Title: Winter coat guide\nTags: Shopping, wear\nSummary: How to pick a warm coat.\nNote: Ask about sizes',
    );
  });

  it('leaves empty parts out and keeps the tag order out of the text', () => {
    expect(
      buildEmbeddingText({ title: 'Only', tagNames: [], summary: null, note: null }, true),
    ).toBe('Title: Only');
    expect(buildEmbeddingText({ ...LINK, tagNames: ['b', 'a'] }, false)).toBe(
      buildEmbeddingText({ ...LINK, tagNames: ['a', 'b'] }, false),
    );
  });

  it('caps the text at 2,000 characters', () => {
    const text = buildEmbeddingText({ ...LINK, note: 'x'.repeat(5000) }, true);
    expect(text).toHaveLength(2000);
    expect(text.startsWith('Title: Winter coat guide')).toBe(true);
  });
});

describe('embeddingTextHash', () => {
  it('is the hex SHA-256 of the text', () => {
    expect(embeddingTextHash('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(embeddingTextHash('abc')).toHaveLength(64);
  });
});
