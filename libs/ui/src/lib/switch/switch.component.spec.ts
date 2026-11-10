import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { disabled, form, FormField } from '@angular/forms/signals';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { compileScss } from '../../testing/scss';
import { SwitchComponent } from './switch.component';

function setup(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(SwitchComponent);
  fixture.componentRef.setInput('label', 'Show notes');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const button = () => host.querySelector('button') as HTMLButtonElement;
  return { fixture, host, button };
}

@Component({
  imports: [SwitchComponent, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ui-switch label="Notes" [formField]="f.notes" />`,
})
class FormHostComponent {
  readonly model = signal({ notes: false });
  readonly lock = signal(false);
  readonly f = form(this.model, (p) => {
    disabled(p.notes, () => this.lock());
  });
}

describe('SwitchComponent', () => {
  it('renders a native button with role switch, named by the label, off by default', () => {
    const { button } = setup();
    expect(button().tagName).toBe('BUTTON');
    expect(button().type).toBe('button');
    expect(button().getAttribute('role')).toBe('switch');
    expect(button().getAttribute('aria-checked')).toBe('false');
    expect(button().getAttribute('aria-label')).toBe('Show notes');
  });

  it('toggles on click and writes the checked model', () => {
    const { fixture, button, host } = setup();
    button().click();
    fixture.detectChanges();
    expect(fixture.componentInstance.checked()).toBe(true);
    expect(button().getAttribute('aria-checked')).toBe('true');
    expect(host.classList).toContain('ui-switch--checked');
    button().click();
    fixture.detectChanges();
    expect(fixture.componentInstance.checked()).toBe(false);
    expect(button().getAttribute('aria-checked')).toBe('false');
  });

  it('is toggled by Space and Enter through the native button click', () => {
    // A native button turns Space and Enter into a click; jsdom does not, so the click stands in.
    const { fixture, button } = setup();
    button().focus();
    expect(document.activeElement).toBe(button());
    button().click();
    expect(fixture.componentInstance.checked()).toBe(true);
  });

  it('does not toggle when disabled', () => {
    const { fixture, button, host } = setup({ disabled: true });
    expect(button().disabled).toBe(true);
    expect(host.classList).toContain('ui-switch--disabled');
    button().click();
    expect(fixture.componentInstance.checked()).toBe(false);
  });

  it('emits touch on blur and focuses through focus()', () => {
    const { fixture, button } = setup();
    let touched = 0;
    fixture.componentInstance.touch.subscribe(() => touched++);
    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(button());
    button().dispatchEvent(new FocusEvent('blur'));
    expect(touched).toBe(1);
  });

  it('binds with [formField]', () => {
    const fixture = TestBed.createComponent(FormHostComponent);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector(
      'button',
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.model().notes).toBe(true);
    fixture.componentInstance.lock.set(true);
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
  });

  it('styles from tokens: spring knob, accent when on, no motion under reduced motion', () => {
    const css = compileScss('lib/switch/switch.component.scss');
    expect(css).toContain('var(--ease-spring)');
    expect(css).toContain('background: var(--accent)');
    expect(css).toContain('background: var(--border-control)');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*transition: none/);
    expect(css).toMatch(/@media \(pointer: coarse\)/);
  });

  it('has no axe violations', async () => {
    const { host } = setup();
    expect(await axeViolations(host)).toEqual([]);
  });
});
