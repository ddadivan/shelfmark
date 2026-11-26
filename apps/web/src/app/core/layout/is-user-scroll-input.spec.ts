import { isUserScrollInput } from './is-user-scroll-input';

function fire(target: HTMLElement, event: Event): Event {
  let seen: Event = event;
  target.addEventListener(event.type, (e) => (seen = e), { once: true });
  target.dispatchEvent(event);
  return seen;
}

const key = (init: KeyboardEventInit): KeyboardEvent =>
  new KeyboardEvent('keydown', { bubbles: true, ...init });

describe('isUserScrollInput', () => {
  let area: HTMLDivElement;
  let field: HTMLTextAreaElement;

  beforeEach(() => {
    area = document.createElement('div');
    field = document.createElement('textarea');
    area.append(field);
    document.body.append(area);
  });

  afterEach(() => area.remove());

  it('counts a wheel turn and a touch', () => {
    expect(isUserScrollInput(new Event('wheel'))).toBe(true);
    expect(isUserScrollInput(new Event('touchstart'))).toBe(true);
  });

  it.each(['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', ' '])(
    'counts the scroll key %j on the page',
    (name) => {
      expect(isUserScrollInput(fire(area, key({ key: name })))).toBe(true);
    },
  );

  it('does not count typing', () => {
    expect(isUserScrollInput(fire(area, key({ key: 'a' })))).toBe(false);
    expect(isUserScrollInput(fire(area, key({ key: 'Enter' })))).toBe(false);
  });

  it('does not count keys typed into an editable element', () => {
    expect(isUserScrollInput(fire(field, key({ key: 'a' })))).toBe(false);
    expect(isUserScrollInput(fire(field, key({ key: ' ' })))).toBe(false);
    expect(isUserScrollInput(fire(field, key({ key: 'ArrowDown' })))).toBe(false);
  });

  it('counts a pointer press outside a field, not inside one', () => {
    const press = (): Event => new Event('pointerdown', { bubbles: true });
    expect(isUserScrollInput(fire(area, press()))).toBe(true);
    expect(isUserScrollInput(fire(field, press()))).toBe(false);
  });
});
