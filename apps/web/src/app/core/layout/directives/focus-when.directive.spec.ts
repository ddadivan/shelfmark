import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ButtonComponent } from '@shelfmark/ui';
import { queryRequired } from '../../../../testing/query-required';
import { FocusWhenDirective } from './focus-when.directive';

@Component({
  imports: [FocusWhenDirective, ButtonComponent],
  template: `
    <button id="plain" [appFocusWhen]="plain()" [appFocusWhenPreventScroll]="true">Plain</button>
    <p id="heading" tabindex="-1" [appFocusWhen]="heading()">Heading</p>
    <div id="wrapper" [appFocusWhen]="wrapper()"><input id="inner" /></div>
    <ui-button id="ui" [appFocusWhen]="ui()">Button</ui-button>
    @if (created()) {
      <button id="born" appFocusWhen>Born</button>
    }
  `,
})
class Host {
  readonly plain = signal(false);
  readonly heading = signal(false);
  readonly wrapper = signal(false);
  readonly ui = signal(false);
  readonly created = signal(false);
}

describe('FocusWhenDirective', () => {
  let host: Host;
  let root: HTMLElement;
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const active = (): string | undefined => document.activeElement?.id;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    root = fixture.nativeElement;
    document.body.append(root);
    await fixture.whenStable();
  });

  afterEach(() => root.remove());

  it('does nothing while the input stays false', async () => {
    expect(document.activeElement).toBe(document.body);
  });

  it('focuses a native control after the render once the input turns true', async () => {
    const focus = vi.spyOn(queryRequired<HTMLElement>(root, '#plain'), 'focus');
    host.plain.set(true);
    await fixture.whenStable();
    expect(active()).toBe('plain');
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('focuses a host with a tabindex', async () => {
    host.heading.set(true);
    await fixture.whenStable();
    expect(active()).toBe('heading');
  });

  it('focuses the first focusable element inside a wrapper', async () => {
    host.wrapper.set(true);
    await fixture.whenStable();
    expect(active()).toBe('inner');
  });

  it('focuses the UI_FOCUS_TARGET of a ui-button', async () => {
    host.ui.set(true);
    await fixture.whenStable();
    expect(root.querySelector('#ui button')).toBe(document.activeElement);
  });

  it('focuses again on each false to true change', async () => {
    host.plain.set(true);
    await fixture.whenStable();
    queryRequired<HTMLElement>(root, '#inner').focus();
    host.plain.set(false);
    await fixture.whenStable();
    expect(active()).toBe('inner');
    host.plain.set(true);
    await fixture.whenStable();
    expect(active()).toBe('plain');
  });

  it('focuses a host that is created with the input already true', async () => {
    host.created.set(true);
    await fixture.whenStable();
    expect(active()).toBe('born');
  });
});
