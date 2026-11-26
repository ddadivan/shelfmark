import { findScrollArea } from './find-scroll-area';

function element(parent: Element, overflowY = ''): HTMLElement {
  const node = document.createElement('div');
  node.style.overflowY = overflowY;
  parent.append(node);
  return node;
}

describe('findScrollArea', () => {
  let root: HTMLDivElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.append(root);
  });

  afterEach(() => root.remove());

  it('finds the nearest scrolling ancestor', () => {
    const outer = element(root, 'auto');
    const chat = element(element(outer));
    expect(findScrollArea(chat)).toBe(outer);
  });

  it('falls back to the document when nothing scrolls', () => {
    expect(findScrollArea(element(element(root)))).toBe(document);
  });
});
