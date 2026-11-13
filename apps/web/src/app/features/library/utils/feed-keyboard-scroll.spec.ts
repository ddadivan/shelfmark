import { feedScrollDelta, scrollFeedForKey } from './feed-keyboard-scroll';

function key(name: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: name, cancelable: true, ...init });
}

describe('feedScrollDelta', () => {
  it('maps the page keys to a page, the arrows to a line and Home and End to the ends', () => {
    expect(feedScrollDelta(key('PageDown'), 500)).toBe(450);
    expect(feedScrollDelta(key('PageUp'), 500)).toBe(-450);
    expect(feedScrollDelta(key(' '), 500)).toBe(450);
    expect(feedScrollDelta(key(' ', { shiftKey: true }), 500)).toBe(-450);
    expect(feedScrollDelta(key('ArrowDown'), 500)).toBe(40);
    expect(feedScrollDelta(key('ArrowUp'), 500)).toBe(-40);
    expect(feedScrollDelta(key('Home'), 500)).toBe(-Infinity);
    expect(feedScrollDelta(key('End'), 500)).toBe(Infinity);
  });

  it('ignores other keys and modified keys', () => {
    expect(feedScrollDelta(key('a'), 500)).toBeNull();
    expect(feedScrollDelta(key('End', { ctrlKey: true }), 500)).toBeNull();
    expect(feedScrollDelta(key('PageDown', { metaKey: true }), 500)).toBeNull();
  });
});

describe('scrollFeedForKey', () => {
  let area: HTMLElement;

  beforeEach(() => {
    // jsdom has no layout: give the area a size and a scroll position of its own.
    let top = 0;
    area = document.createElement('div');
    area.style.overflowY = 'auto';
    Object.defineProperties(area, {
      clientHeight: { value: 100 },
      scrollHeight: { value: 1000 },
      scrollTop: {
        get: () => top,
        set: (value: number) => {
          top = Math.max(0, Math.min(value, 900));
        },
      },
    });
    document.body.append(area);
  });

  afterEach(() => {
    area.remove();
  });

  it('scrolls the area for End and Home when nothing has focus', () => {
    const end = key('End');
    expect(scrollFeedForKey(area, end)).toBe(true);
    expect(end.defaultPrevented).toBe(true);
    expect(area.scrollTop).toBe(900);

    expect(scrollFeedForKey(area, key('PageDown'))).toBe(true);
    expect(area.scrollTop).toBe(900);

    expect(scrollFeedForKey(area, key('Home'))).toBe(true);
    expect(area.scrollTop).toBe(0);

    expect(scrollFeedForKey(area, key('PageDown'))).toBe(true);
    expect(area.scrollTop).toBe(90);
  });

  it('leaves the keys to a focused element', () => {
    const button = document.createElement('button');
    document.body.append(button);
    button.focus();

    const event = key('End');
    expect(scrollFeedForKey(area, event)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
    button.remove();
  });

  it('scrolls the nearest scrolling ancestor when the feed does not scroll (the mobile shell, #352)', () => {
    const feed = document.createElement('div');
    area.append(feed);

    expect(scrollFeedForKey(feed, key('End'))).toBe(true);
    expect(area.scrollTop).toBe(900);
  });

  it('does nothing when nothing scrolls', () => {
    area.style.overflowY = 'visible';
    expect(scrollFeedForKey(area, key('End'))).toBe(false);
  });
});
