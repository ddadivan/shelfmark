import { Component, type Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { mediaMatch } from './media-match';

class FakeList extends EventTarget {
  matches: boolean;
  constructor(matches: boolean) {
    super();
    this.matches = matches;
  }
  change(matches: boolean): void {
    this.matches = matches;
    this.dispatchEvent(Object.assign(new Event('change'), { matches }));
  }
}

@Component({ selector: 'ui-media-host', template: '' })
class HostComponent {
  readonly match: Signal<boolean> = mediaMatch('(width < 40em)');
}

function stubMatchMedia(result: FakeList | undefined): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: () => result,
  });
}

describe('mediaMatch', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia');
  });

  it('starts with the current match and follows changes', () => {
    const list = new FakeList(true);
    stubMatchMedia(list);
    const fixture = TestBed.createComponent(HostComponent);
    expect(fixture.componentInstance.match()).toBe(true);
    list.change(false);
    expect(fixture.componentInstance.match()).toBe(false);
  });

  it('stops listening on destroy', () => {
    const list = new FakeList(false);
    stubMatchMedia(list);
    const remove = vi.spyOn(list, 'removeEventListener');
    const fixture = TestBed.createComponent(HostComponent);
    fixture.destroy();
    expect(remove).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('is false where matchMedia is missing', () => {
    stubMatchMedia(undefined);
    const fixture = TestBed.createComponent(HostComponent);
    expect(fixture.componentInstance.match()).toBe(false);
  });
});
