import { askKeywords } from './ask-keywords';

describe('askKeywords', () => {
  it('keeps topic words as stems and drops question words', () => {
    expect(askKeywords('Which ramen recipes did I save?')).toEqual(['ramen', 'recip']);
    expect(askKeywords('What have I saved about the two coats?')).toEqual(['two', 'coat']);
  });

  it('answers nothing for a question without a topic, and at most six words', () => {
    expect(askKeywords('What did I save?')).toEqual([]);
    expect(askKeywords('alpha bravo charlie delta echo foxtrot golf hotel')).toHaveLength(6);
  });
});
