import { segmentsFromAnswer } from './entries-from-conversation';

describe('segmentsFromAnswer', () => {
  it('turns one- and two-digit markers into citations and keeps other brackets as text', () => {
    expect(segmentsFromAnswer('[1] starts, then [12] and [2024] or [x].')).toEqual([
      { cite: 1 },
      { text: ' starts, then ' },
      { cite: 12 },
      { text: ' and [2024] or [x].' },
    ]);
    expect(segmentsFromAnswer('')).toEqual([]);
    expect(segmentsFromAnswer('plain')).toEqual([{ text: 'plain' }]);
  });
});
