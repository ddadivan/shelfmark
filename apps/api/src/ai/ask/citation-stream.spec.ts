import { CitationStream } from './citation-stream';

const run = (stream: CitationStream, deltas: string[]) => [
  ...deltas.flatMap((delta) => stream.push(delta)),
  ...stream.flush(),
];

describe('CitationStream', () => {
  it('turns markers into cites, renumbered by first appearance, repeated ones reused', () => {
    const stream = new CitationStream(5);
    expect(run(stream, ['Ramen [3] and coats [1]. Again [3].'])).toEqual([
      { type: 'text', text: 'Ramen ' },
      { type: 'cite', n: 1 },
      { type: 'text', text: ' and coats ' },
      { type: 'cite', n: 2 },
      { type: 'text', text: '. Again ' },
      { type: 'cite', n: 1 },
      { type: 'text', text: '.' },
    ]);
    expect(stream.cited).toEqual([3, 1]);
    expect(stream.truncated).toBe(false);
    expect(stream.hasText).toBe(true);
  });

  it('holds a marker split across deltas and releases it whole', () => {
    const stream = new CitationStream(10);
    expect(stream.push('See [')).toEqual([{ type: 'text', text: 'See ' }]);
    expect(stream.push('1')).toEqual([]);
    expect(stream.push('0')).toEqual([]);
    expect(stream.push('] done')).toEqual([
      { type: 'cite', n: 1 },
      { type: 'text', text: ' done' },
    ]);
    expect(stream.cited).toEqual([10]);
  });

  it('keeps out-of-range, non-numeric and long brackets as text', () => {
    const stream = new CitationStream(10);
    const events = run(stream, ['In [2024] I saved [11], [0], [a], [123] and [x', 'y] and [', '']);
    expect(events.every((event) => event.type === 'text')).toBe(true);
    expect(events.map((event) => ('text' in event ? event.text : '')).join('')).toBe(
      'In [2024] I saved [11], [0], [a], [123] and [xy] and [',
    );
    expect(stream.cited).toEqual([]);
  });

  it('releases a partial marker as text at the end', () => {
    const stream = new CitationStream(3);
    expect(run(stream, ['end [2'])).toEqual([
      { type: 'text', text: 'end ' },
      { type: 'text', text: '[2' },
    ]);
  });

  it('cuts text at the cap, marks it truncated and ignores the rest', () => {
    const stream = new CitationStream(3, 10);
    expect(stream.push('abcdef [1] ')).toEqual([
      { type: 'text', text: 'abcdef ' },
      { type: 'cite', n: 1 },
      { type: 'text', text: ' ' },
    ]);
    expect(stream.push('ghijk [2]')).toEqual([{ type: 'text', text: 'gh' }]);
    expect(stream.truncated).toBe(true);
    expect(stream.push('more')).toEqual([]);
    expect(stream.flush()).toEqual([]);
    expect(stream.cited).toEqual([1]);
  });

  it('drops a cite that comes after the cap was hit inside the same delta', () => {
    const stream = new CitationStream(3, 4);
    expect(stream.push('abcdef [1]')).toEqual([{ type: 'text', text: 'abcd' }]);
    expect(stream.cited).toEqual([]);
    const exact = new CitationStream(3, 3);
    expect(exact.push('abc')).toEqual([{ type: 'text', text: 'abc' }]);
    expect(exact.push('d')).toEqual([]);
    expect(exact.truncated).toBe(true);
  });

  it('counts characters, not UTF-16 units, and passes newlines as text', () => {
    const stream = new CitationStream(1, 3);
    expect(stream.push('🍜🍜\n🍜')).toEqual([{ type: 'text', text: '🍜🍜\n' }]);
    expect(new CitationStream(1).hasText).toBe(false);
  });
});
