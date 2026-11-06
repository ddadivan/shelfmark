import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { TEXTAREA_MAX_ROWS } from './models/textarea-max-rows.const';
import { TextareaComponent } from './textarea.component';

function setup(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(TextareaComponent);
  fixture.componentRef.setInput('label', 'Note');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const q = (s: string) => host.querySelector<HTMLElement>(s);
  const area = () => q('textarea') as HTMLTextAreaElement;
  return { fixture, host, q, area };
}

describe('TextareaComponent', () => {
  it('has a label wired to the textarea and 3 rows by default', () => {
    const { q, area } = setup({ placeholder: 'Why are you saving this?' });
    expect(q('label')?.getAttribute('for')).toBe(area().id);
    expect(area().rows).toBe(3);
    expect(area().getAttribute('placeholder')).toBe('Why are you saving this?');
    expect(q('.ui-field__control--textarea')).not.toBeNull();
  });

  it('takes rows and grows to at most 8 rows', () => {
    const { area } = setup({ rows: 5 });
    expect(area().rows).toBe(5);
    expect(TEXTAREA_MAX_ROWS).toBe(8);
    expect(area().classList.contains('cdk-textarea-autosize')).toBe(true);
  });

  it('writes typing into the value model and shows outside values', () => {
    const { fixture, area } = setup();
    area().value = 'note';
    area().dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.value()).toBe('note');
    fixture.componentInstance.value.set('other');
    fixture.detectChanges();
    expect(area().value).toBe('other');
  });

  it('shows a counter that follows the text, with a hidden unit', () => {
    const { fixture, q, area } = setup({ maxLength: 20, counterLabel: 'characters' });
    expect(area().getAttribute('maxlength')).toBe('20');
    expect(q('.ui-field__counter')?.textContent).toContain('0 / 20');
    fixture.componentInstance.value.set('Watch on the weekend');
    fixture.detectChanges();
    expect(q('.ui-field__counter')?.textContent).toContain('20 / 20');
    expect(area().getAttribute('aria-describedby')).toContain(q('.ui-field__counter')?.id);
  });

  it('has no counter without maxLength', () => {
    const { q, area } = setup();
    expect(q('.ui-field__counter')).toBeNull();
    expect(area().getAttribute('maxlength')).toBeNull();
  });

  it('shows hint and error, describes the textarea by them and flags it invalid', () => {
    const { area, q } = setup({ hint: 'Helps you find it', error: 'Too long', required: true });
    const ids = area().getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(ids).toHaveLength(2);
    expect(q(`#${ids[0]}`)?.textContent).toBe('Too long');
    expect(area().getAttribute('aria-invalid')).toBe('true');
    expect(area().getAttribute('aria-required')).toBe('true');
  });

  it('shows form errors after touch only', () => {
    const { fixture, area } = setup({ errors: [{ kind: 'maxLength', message: 'Too long' }] });
    expect(area().getAttribute('aria-invalid')).toBeNull();
    fixture.componentRef.setInput('touched', true);
    fixture.detectChanges();
    expect(area().getAttribute('aria-invalid')).toBe('true');
  });

  it('disables, emits touch on blur and focuses', () => {
    const { fixture, host, area } = setup({ disabled: true });
    expect(area().disabled).toBe(true);
    fixture.componentRef.setInput('disabled', false);
    fixture.detectChanges();
    const spy = vi.fn();
    fixture.componentInstance.touch.subscribe(spy);
    document.body.append(host);
    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(area());
    area().dispatchEvent(new Event('blur'));
    expect(spy).toHaveBeenCalledOnce();
    host.remove();
  });

  it.each([
    ['default', {}],
    ['counter and hint', { maxLength: 100, hint: 'Hint', counterLabel: 'characters' }],
    ['error', { error: 'Too long' }],
    ['disabled', { disabled: true }],
  ])('has no axe violations (%s)', async (_name, inputs) => {
    expect(await axeViolations(setup(inputs).host)).toEqual([]);
  });
});
