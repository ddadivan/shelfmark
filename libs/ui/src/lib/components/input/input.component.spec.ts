import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { ReducedMotion } from '../../services/motion/reduced-motion.service';
import { InputComponent } from './input.component';
import { INPUT_TYPE } from './models/input-type.const';

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('Expected value to be present');
  }
  return value;
}

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

  it('compact keeps the label wired to the input and marks the pill', () => {
    const { host, q, input } = setup({ compact: true });
    expect(host.classList).toContain('ui-input--compact');
    expect(q('.ui-field--compact')).not.toBeNull();
    expect(q('label')?.getAttribute('for')).toBe(input().id);
  });

  it('labelHidden keeps the label for assistive technology only', () => {
    const { q, input } = setup({ labelHidden: true });
    expect(q('.ui-field--label-hidden')).not.toBeNull();
    expect(q('label')?.getAttribute('for')).toBe(input().id);
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

  it('readonly keeps the field focusable, hides the clear button and select() selects all', () => {
    const { fixture, host, input, q } = setup({
      readonly: true,
      clearable: true,
      clearLabel: 'Clear',
      value: 'https://example.com/c/token',
    });
    document.body.append(host);
    expect(input().readOnly).toBe(true);
    expect(input().disabled).toBe(false);
    expect(q('.ui-input__clear')).toBeNull();
    fixture.componentInstance.select();
    expect(document.activeElement).toBe(input());
    expect(input().selectionStart).toBe(0);
    expect(input().selectionEnd).toBe('https://example.com/c/token'.length);
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

  it('shows a trailing spinner for url and text types while loading, keeping the icon', () => {
    const { fixture, host } = setup({ type: INPUT_TYPE.Url, icon: 'link', loading: true });
    const spinner = host.querySelector('.ui-input__spinner');
    expect(spinner).not.toBeNull();
    expect(spinner?.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('ui-icon')).not.toBeNull();
    expect(host.querySelector('.ui-input__slot ui-spinner')).toBeNull();
    fixture.componentRef.setInput('type', INPUT_TYPE.Text);
    fixture.detectChanges();
    expect(host.querySelector('.ui-input__spinner')).not.toBeNull();
  });

  it('puts the trailing spinner before the clear button and names it by loadingLabel', () => {
    const { fixture, host } = setup({
      type: INPUT_TYPE.Url,
      loading: true,
      loadingLabel: 'Loading preview',
      clearable: true,
      clearLabel: 'Clear',
      value: 'https://a.b',
    });
    TestBed.tick();
    fixture.detectChanges();
    const spinner = host.querySelector('.ui-input__spinner');
    const clear = host.querySelector('.ui-input__clear');
    expect(spinner?.getAttribute('role')).toBe('status');
    expect(spinner?.textContent?.trim()).toBe('Loading preview');
    expect(
      must(spinner).compareDocumentPosition(must(clear)) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('sets aria-busy on the input only while loading', () => {
    const { fixture, input } = setup({ type: INPUT_TYPE.Url });
    expect(input().getAttribute('aria-busy')).toBeNull();
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(input().getAttribute('aria-busy')).toBe('true');
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    expect(input().getAttribute('aria-busy')).toBeNull();
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

    describe('word dissolve (#562)', () => {
      const words = (host: HTMLElement) =>
        Array.from(host.querySelectorAll('.ui-input__word')).map((el) => el.textContent);

      function cleared(value: string) {
        const ctx = setup({ clearable: true, clearLabel: 'Clear' });
        ctx.fixture.componentInstance.value.set(value);
        ctx.fixture.detectChanges();
        ctx.q('.ui-input__clear')?.click();
        ctx.fixture.detectChanges();
        return ctx;
      }

      it('clears the value at once and dissolves the old words in an aria-hidden overlay', () => {
        const { fixture, host, q } = cleared('red pepper soup');
        expect(fixture.componentInstance.value()).toBe('');
        expect(words(host)).toEqual(['red ', 'pepper ', 'soup']);
        expect(q('.ui-input__dissolve')?.getAttribute('aria-hidden')).toBe('true');
        expect(host.querySelector('input')?.value).toBe('');
      });

      it('steps the words one after the other (#564)', () => {
        const { host, q } = cleared('red pepper soup');
        expect(q('.ui-input__dissolve')?.style.getPropertyValue('--ui-dissolve-step')).toBe('60ms');
        const steps = Array.from(host.querySelectorAll<HTMLElement>('.ui-input__word')).map(
          (word) => word.style.getPropertyValue('--ui-dissolve-i'),
        );
        expect(steps).toEqual(['0', '1', '2']);
      });

      it('renders the words as text, never as HTML', () => {
        const { host } = cleared('<b>bold</b> text');
        expect(host.querySelector('.ui-input__dissolve b')).toBeNull();
        expect(words(host).join('')).toBe('<b>bold</b> text');
      });

      it('caps the overlay at 8 words', () => {
        const { host } = cleared('a b c d e f g h i j');
        expect(words(host)).toHaveLength(8);
      });

      it('removes the overlay after the last word ended', () => {
        const { fixture, host, q } = cleared('one two');
        const last = host.querySelector('.ui-input__word:last-child') as HTMLElement;
        last.dispatchEvent(new Event('animationend', { bubbles: true }));
        fixture.detectChanges();
        expect(q('.ui-input__dissolve')).toBeNull();
      });

      it('ignores the end of an earlier word', () => {
        const { fixture, host, q } = cleared('one two');
        const first = host.querySelector('.ui-input__word') as HTMLElement;
        first.dispatchEvent(new Event('animationend', { bubbles: true }));
        fixture.detectChanges();
        expect(q('.ui-input__dissolve')).not.toBeNull();
      });

      it('drops the overlay when the user types again', () => {
        const { fixture, q, input } = cleared('one two');
        input().value = 'n';
        input().dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(q('.ui-input__dissolve')).toBeNull();
      });

      it('is removed by the safety timer when no animation runs', () => {
        vi.useFakeTimers();
        try {
          const { fixture, q } = cleared('one two');
          expect(q('.ui-input__dissolve')).not.toBeNull();
          vi.advanceTimersByTime(500);
          fixture.detectChanges();
          expect(q('.ui-input__dissolve')).toBeNull();
        } finally {
          vi.useRealTimers();
        }
      });

      it('clears instantly with no overlay under reduced motion', () => {
        const ctx = setup({ clearable: true, clearLabel: 'Clear' });
        TestBed.inject(ReducedMotion).setAppReduced(true);
        ctx.fixture.componentInstance.value.set('one two');
        ctx.fixture.detectChanges();
        ctx.q('.ui-input__clear')?.click();
        ctx.fixture.detectChanges();
        expect(ctx.fixture.componentInstance.value()).toBe('');
        expect(ctx.q('.ui-input__dissolve')).toBeNull();
      });
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
    ['compact', { compact: true, label: 'New tag' }],
    ['search loading', { type: INPUT_TYPE.Search, loading: true }],
    [
      'url loading with label',
      { type: INPUT_TYPE.Url, loading: true, loadingLabel: 'Loading preview', icon: 'link' },
    ],
  ])('has no axe violations (%s)', async (_name, inputs) => {
    const { fixture, host } = setup(inputs);
    fixture.detectChanges();
    expect(await axeViolations(host)).toEqual([]);
  });
});

@Component({
  imports: [InputComponent],
  template: `<ui-input label="Name" value="Learning"
    ><span uiInputLead class="lead-probe" aria-hidden="true">L</span></ui-input
  >`,
})
class LeadHostComponent {}

describe('InputComponent lead slot', () => {
  it('projects a uiInputLead element before the text; the slot stays empty without one', async () => {
    const fixture = TestBed.createComponent(LeadHostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const lead = host.querySelector('.ui-input__lead');
    expect(lead?.querySelector('.lead-probe')).not.toBeNull();
    expect(lead?.compareDocumentPosition(host.querySelector('input') as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(await axeViolations(host)).toEqual([]);

    const plain = setup();
    expect(plain.q('.ui-input__lead')?.childElementCount).toBe(0);
  });
});
