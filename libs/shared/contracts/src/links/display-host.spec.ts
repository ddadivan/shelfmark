import { describe, expect, it } from 'vitest';
import { displayHost } from './display-host';
import { stripWww } from './strip-www';

describe('displayHost', () => {
  it('drops www. and keeps the rest of the host', () => {
    expect(displayHost('https://www.example.com/a?b=1')).toBe('example.com');
    expect(displayHost('https://blog.example.com/')).toBe('blog.example.com');
    expect(displayHost('https://WWW.Example.COM.')).toBe('example.com');
  });

  it('answers the input when it is not a URL', () => {
    expect(displayHost('not a url')).toBe('not a url');
    expect(displayHost('')).toBe('');
  });
});

describe('stripWww', () => {
  it('only drops a leading www.', () => {
    expect(stripWww('www.example.com')).toBe('example.com');
    expect(stripWww('example.www.com')).toBe('example.www.com');
    expect(stripWww('wwwexample.com')).toBe('wwwexample.com');
  });
});
