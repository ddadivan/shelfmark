import { scoreForKey } from './score-for-key';

describe('scoreForKey', () => {
  it.each([
    ['1', 1],
    ['5', 5],
    ['9', 9],
    ['0', 10],
  ])('maps %s to %i', (key, score) => {
    expect(scoreForKey(key)).toBe(score);
  });

  it.each(['a', 'Enter', 'ArrowLeft', '', '10', ' '])('ignores %j', (key) => {
    expect(scoreForKey(key)).toBeNull();
  });
});
