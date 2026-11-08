import { TestBed } from '@angular/core/testing';
import { LinkOpener } from './link-opener.service';

describe('LinkOpener', () => {
  afterEach(() => vi.restoreAllMocks());

  it('opens a new tab with a plain anchor click', () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    TestBed.inject(LinkOpener).open('https://example.com/a', false);

    expect(click).toHaveBeenCalledTimes(1);
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.target).toBe('_blank');
    expect(anchor.rel).toBe('noopener noreferrer');
    expect(anchor.href).toBe('https://example.com/a');
  });

  it('sends a click with the platform modifier for the background', () => {
    const events: MouseEvent[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'dispatchEvent').mockImplementation((event) => {
      events.push(event as MouseEvent);
      return true;
    });

    TestBed.inject(LinkOpener).open('https://example.com/a', true);

    expect(events).toHaveLength(1);
    expect(events[0].metaKey || events[0].ctrlKey).toBe(true);
  });
});
