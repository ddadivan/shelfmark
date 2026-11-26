import { isTextCut } from './is-text-cut';

function box(scroll: [number, number], client: [number, number]): HTMLElement {
  const el = document.createElement('span');
  Object.defineProperty(el, 'scrollWidth', { value: scroll[0] });
  Object.defineProperty(el, 'clientWidth', { value: client[0] });
  Object.defineProperty(el, 'scrollHeight', { value: scroll[1] });
  Object.defineProperty(el, 'clientHeight', { value: client[1] });
  document.body.append(el);
  return el;
}

describe('isTextCut', () => {
  afterEach(() => document.body.replaceChildren());

  it('is false when the text fits', () => {
    expect(isTextCut(box([120, 20], [160, 20]))).toBe(false);
  });

  it('is true for a one-line ellipsis (wider content)', () => {
    expect(isTextCut(box([240, 20], [160, 20]))).toBe(true);
  });

  it('is true for a line clamp (taller content)', () => {
    expect(isTextCut(box([160, 60], [160, 40]))).toBe(true);
  });
});
