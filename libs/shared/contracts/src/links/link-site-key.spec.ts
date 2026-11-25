import { linkSiteKey } from './link-site-key';

describe('linkSiteKey', () => {
  it('is the lower-case host without a leading www.', () => {
    expect(linkSiteKey('https://www.Example.com/a?b=1')).toBe('example.com');
    expect(linkSiteKey('http://user:pw@Blog.Example.org:8080/p')).toBe('blog.example.org');
    expect(linkSiteKey('https://wwwx.test/')).toBe('wwwx.test');
  });

  it('is empty for text that is not a URL', () => {
    expect(linkSiteKey('not a url')).toBe('');
  });
});
