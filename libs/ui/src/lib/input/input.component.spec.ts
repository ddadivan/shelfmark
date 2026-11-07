import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { InputComponent } from './input.component';
import { INPUT_TYPE } from './models/input-type.const';

function setup(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(InputComponent);
  fixture.componentRef.setInput('label', 'Link');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const q = (s: string) => host.querySelector<HTMLElement>(s);
  const input = () => q('input') as HTMLInputElement;
  return { fixture, host, q, input };
}

describe('InputComponent', () => {
  it('is a text input with a visible label wired to it', () => {
    const { q, input } = setup({ placeholder: 'https://' });
    expect(input().type).toBe('text');
    expect(q('label')?.textContent).toBe('Link');
    expect(q('label')?.getAttribute('for')).toBe(input().id);
    expect(input().getAttribute('placeholder')).toBe('https://');
    expect(input().getAttribute('aria-describedby')).toBeNull();
    expect(input().getAttribute('aria-invalid')).toBeNull();
  });

  it('url uses the mono control and URL hints', () => {
    const { q, input } = setup({ type: INPUT_TYPE.Url });
    expect(input().type).toBe('url');
    expect(input().getAttribute('inputmode')).toBe('url');
    expect(input().getAttribute('spellcheck')).toBe('false');
    expect(q('.ui-field__control--url')).not.toBeNull();
  });

  it('writes typing into the value model', () => {
    const { fixture, input } = setup();
    input().value = 'abc';
    input().dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.value()).toBe('abc');
  });

  it('shows a value set from outside', () => {
    const { fixture, input } = setup();
    fixture.componentInstance.value.set('hello');
    fixture.detectChanges();
    expect(input().value).toBe('hello');
  });

  it('links hint and error to the input and sets aria-invalid', () => {
    const { input, q } = setup({ hint: 'A hint', error: 'Enter an address' });
    const ids = input().getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(ids).toHaveLength(2);
    expect(q(`#${ids[0]}`)?.textContent).toBe('Enter an address');
    expect(q(`#${ids[1]}`)?.textContent).toBe('A hint');
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(q('#' + ids[0])?.getAttribute('aria-live')).toBe('polite');
  });

  it('shows form errors only after the field is touched', () => {
    const { fixture, input } = setup({ errors: [{ kind: 'required', message: 'Required' }] });
    expect(input().getAttribute('aria-invalid')).toBeNull();
    fixture.componentRef.setInput('touched', true);
    fixture.detectChanges();
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(fixture.nativeElement.querySelector('.ui-field__error').textContent).toBe('Required');
  });

  it('is invalid for a touched field whose errors have no message', () => {
    const { fixture, input, q } = setup({ errors: [{ kind: 'custom' }], touched: true });
    fixture.detectChanges();
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(q('.ui-field__error')?.textContent).toBe('');
  });

  it('sets aria-required and disables the native input', () => {
    const { input } = setup({ required: true, disabled: true });
    expect(input().getAttribute('aria-required')).toBe('true');
    expect(input().disabled).toBe(true);
  });

  it('emits touch on blur', () => {
    const { fixture, input } = setup();
    const spy = vi.fn();
    fixture.componentInstance.touch.subscribe(spy);
    input().dispatchEvent(new Event('blur'));
    expect(spy).toHaveBeenCalledOnce();
  });

  it('focus() focuses the native input', () => {
    const { fixture, host, input } = setup();
    document.body.append(host);
    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(input());
    host.remove();
  });

  it('shows a shortcut hint hidden from screen readers', () => {
    const { q } = setup({ shortcut: '⌘K' });
    expect(q('.ui-input__kbd')?.textContent).toBe('⌘K');
    expect(q('.ui-input__kbd')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('draws an icon, and the search icon by default for search', () => {
    expect(setup({ icon: 'link' }).host.querySelector('use')?.getAttribute('href')).toContain(
      '#sm-link',
    );
    expect(
      setup({ type: INPUT_TYPE.Search }).host.querySelector('use')?.getAttribute('href'),
    ).toContain('#sm-search');
    expect(setup().q('.ui-input__slot')).toBeNull();
  });

  it('swaps the search icon for a spinner while loading', () => {
    const { fixture, host } = setup({ type: INPUT_TYPE.Search, loading: true });
    expect(host.querySelector('ui-spinner')).not.toBeNull();
    expect(host.querySelector('ui-icon')).toBeNull();
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    TestBed.tick();
    expect(host.querySelector('ui-icon')).not.toBeNull();
    expect(host.querySelector('.ui-input__glyph--return')).not.toBeNull();
  });

  it('forwards loadingLabel to the spinner as a status region', () => {
    const { fixture, host } = setup({ type: INPUT_TYPE.Search, loading: true });
    expect(host.querySelector('ui-spinner')?.getAttribute('role')).toBeNull();
    expect(host.querySelector('ui-spinner')?.getAttribute('aria-hidden')).toBe('true');
    fixture.componentRef.setInput('loadingLabel', 'Searching');
    fixture.detectChanges();
    TestBed.tick();
    const spinner = host.querySelector('ui-spinner');
    expect(spinner?.getAttribute('role')).toBe('status');
    expect(spinner?.textContent?.trim()).toBe('Searching');
  });

  it('ignores loading for other types', () => {
    const { host } = setup({ icon: 'link', loading: true });
    expect(host.querySelector('ui-spinner')).toBeNull();
  });

  describe('clear button', () => {
    it('only exists for a clearable field with a value, named by clearLabel', () => {
      const { fixture, q } = setup({ clearable: true, clearLabel: 'Clear link' });
      expect(q('.ui-input__clear')).toBeNull();
      fixture.componentInstance.value.set('x');
      fixture.detectChanges();
      expect(q('.ui-input__clear')?.getAttribute('aria-label')).toBe('Clear link');
      expect(q('.ui-input__clear')?.getAttribute('type')).toBe('button');
    });

    it('is not rendered without a clearLabel (no nameless button)', () => {
      const { fixture, q } = setup({ clearable: true });
      fixture.componentInstance.value.set('x');
      fixture.detectChanges();
      expect(q('.ui-input__clear')).toBeNull();
    });

    it('is not shown when not clearable or disabled', () => {
      const a = setup({ value: 'x' });
      a.fixture.componentInstance.value.set('x');
      a.fixture.detectChanges();
      expect(a.q('.ui-input__clear')).toBeNull();
      const b = setup({ clearable: true, disabled: true });
      b.fixture.componentInstance.value.set('x');
      b.fixture.detectChanges();
      expect(b.q('.ui-input__clear')).toBeNull();
    });

    it('empties the field and returns focus to it', () => {
      const { fixture, host, q, input } = setup({ clearable: true, clearLabel: 'Clear' });
      document.body.append(host);
      fixture.componentInstance.value.set('abc');
      fixture.detectChanges();
      q('.ui-input__clear')?.click();
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toBe('');
      expect(document.activeElement).toBe(input());
      expect(q('.ui-input__clear')).toBeNull();
      host.remove();
    });

    it('does not take focus from the field on mouse down', () => {
      const { fixture, q } = setup({ clearable: true, clearLabel: 'Clear' });
      fixture.componentInstance.value.set('abc');
      fixture.detectChanges();
      const event = new MouseEvent('mousedown', { cancelable: true });
      q('.ui-input__clear')?.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });
  });

  it.each([
    ['default', {}],
    [
      'url with clear and shortcut',
      {
        type: INPUT_TYPE.Url,
        clearable: true,
        clearLabel: 'Clear',
        shortcut: '⌘K',
        value: 'https://a.b',
      },
    ],
    ['error and hint', { error: 'Enter an address', hint: 'Hint' }],
    ['disabled', { disabled: true }],
    ['search loading', { type: INPUT_TYPE.Search, loading: true }],
  ])('has no axe violations (%s)', async (_name, inputs) => {
    const { fixture, host } = setup(inputs);
    fixture.detectChanges();
    expect(await axeViolations(host)).toEqual([]);
  });
});
