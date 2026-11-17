import { detectRuleOffer } from './detect-rule-offer';

const link = (url: string, folderId: string | null, autoFiled = false) => ({
  url,
  folderId,
  autoFiled,
});
const yt = (folderId: string | null, autoFiled = false) =>
  link('https://www.youtube.com/watch?v=1', folderId, autoFiled);

describe('detectRuleOffer', () => {
  it('offers the folder of the newest three and counts the run', () => {
    expect(detectRuleOffer('youtube.com', [yt('v'), yt('v'), yt('v'), yt('v'), yt('x')])).toEqual({
      folderId: 'v',
      count: 4,
    });
  });

  it('needs three', () => {
    expect(detectRuleOffer('youtube.com', [yt('v'), yt('v')])).toBeNull();
    expect(detectRuleOffer('youtube.com', [])).toBeNull();
  });

  it('refuses mixed folders and a newest link in Unsorted', () => {
    expect(detectRuleOffer('youtube.com', [yt('v'), yt('x'), yt('v'), yt('v')])).toBeNull();
    expect(detectRuleOffer('youtube.com', [yt(null), yt('v'), yt('v'), yt('v')])).toBeNull();
  });

  it('does not count a link AI filed', () => {
    expect(detectRuleOffer('youtube.com', [yt('v'), yt('v', true), yt('v')])).toBeNull();
  });

  it('keeps only links of exactly that host (www. dropped, subdomains apart)', () => {
    const candidates = [
      link('https://m.youtube.com/a', 'x'),
      link('https://YouTube.com/b', 'v'),
      link('https://notyoutube.com/c', 'x'),
      yt('v'),
      link('https://youtube.com./d', 'v'),
    ];
    expect(detectRuleOffer('youtube.com', candidates)).toEqual({ folderId: 'v', count: 3 });
    expect(detectRuleOffer('m.youtube.com', candidates)).toBeNull();
  });
});
