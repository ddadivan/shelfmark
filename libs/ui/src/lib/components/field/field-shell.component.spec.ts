import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { FieldShellComponent } from './field-shell.component';

function setup(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(FieldShellComponent);
  fixture.componentRef.setInput('controlId', 'c1');
  fixture.componentRef.setInput('label', 'Title');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  return { host, q: (s: string) => host.querySelector<HTMLElement>(s) };
}

describe('FieldShellComponent', () => {
  it('shows the label for the control id', () => {
    const { q } = setup();
    expect(q('.ui-field__label')?.textContent).toBe('Title');
    expect(q('.ui-field__label')?.getAttribute('for')).toBe('c1');
  });

  it('renders no hint or counter by default but keeps the error live region', () => {
    const { q } = setup();
    expect(q('.ui-field__hint')).toBeNull();
    expect(q('.ui-field__counter')).toBeNull();
    expect(q('#c1-error')?.getAttribute('aria-live')).toBe('polite');
    expect(q('.ui-field__message--filled')).toBeNull();
  });

  it('shows the hint, and hides it visually while an error is shown', () => {
    const { q } = setup({ hint: 'Helps you find it', error: 'Enter a title' });
    expect(q('#c1-hint')?.textContent).toBe('Helps you find it');
    expect(q('#c1-hint')?.classList.contains('ui-field__hint--hidden')).toBe(true);
    expect(q('#c1-error')?.textContent).toBe('Enter a title');
    expect(q('.ui-field--error')).not.toBeNull();
  });

  it('marks invalid without a message, disabled, mono and multiline', () => {
    const { q } = setup({ invalid: true, disabled: true, mono: true, multiline: true });
    expect(q('.ui-field--error')).not.toBeNull();
    expect(q('.ui-field--disabled')).not.toBeNull();
    expect(q('.ui-field__control--url')).not.toBeNull();
    expect(q('.ui-field__control--textarea')).not.toBeNull();
  });

  it('shows the counter with a hidden unit for screen readers', () => {
    const { q } = setup({ counter: '4 / 10', counterLabel: 'characters' });
    expect(q('#c1-counter')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('4 / 10 characters');
    expect(q('.ui-field__counter-label')).not.toBeNull();
  });

  it('has no axe violations around a labelled control', async () => {
    const { host, q } = setup({ hint: 'Hint' });
    const input = document.createElement('input');
    input.id = 'c1';
    q('.ui-field__control')?.append(input);
    expect(await axeViolations(host)).toEqual([]);
  });
});
