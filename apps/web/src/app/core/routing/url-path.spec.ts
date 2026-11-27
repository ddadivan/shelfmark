import { urlPath } from './url-path';

describe('urlPath', () => {
  it('drops the query string and the fragment', () => {
    expect(urlPath('/folders/a?x=1#top')).toBe('/folders/a');
    expect(urlPath('/folders/a#top')).toBe('/folders/a');
    expect(urlPath('/ask?c=1')).toBe('/ask');
  });

  it('keeps a plain path and handles an empty string', () => {
    expect(urlPath('/links')).toBe('/links');
    expect(urlPath('')).toBe('');
  });
});
