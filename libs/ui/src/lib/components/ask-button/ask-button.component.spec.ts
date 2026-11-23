import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { compileScss } from '../../../testing/scss';
import { AskButtonComponent } from './ask-button.component';
import { UiAskButtonHarness } from './testing/ask-button.harness';

@Component({
  imports: [AskButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ui-ask-button
    label="Ask"
    shortcut="Ctrl J"
    [disabled]="locked()"
    (activated)="count.set(count() + 1)"
  />`,
})
class HostComponent {
  readonly count = signal(0);
  readonly locked = signal(false);
}

describe('AskButtonComponent', () => {
  it('renders a native button with the spark and the label', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const button = root.querySelector('button') as HTMLButtonElement;
    expect(button.type).toBe('button');
    expect(button.textContent?.trim()).toBe('Ask');
    expect(root.querySelector('ui-icon')).not.toBeNull();
    expect(button.getAttribute('aria-keyshortcuts')).toBe('Ctrl J');
    expect(await axeViolations(root)).toEqual([]);
  });

  it('emits activated on click and not while disabled', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const harness = await loader.getHarness(UiAskButtonHarness);
    expect(await harness.getText()).toBe('Ask');
    await harness.click();
    expect(fixture.componentInstance.count()).toBe(1);

    fixture.componentInstance.locked.set(true);
    expect(await harness.isDisabled()).toBe(true);
    await harness.click();
    expect(fixture.componentInstance.count()).toBe(1);
  });

  it('focuses the inner button and forwards aria-expanded', async () => {
    const fixture = TestBed.createComponent(AskButtonComponent);
    fixture.componentRef.setInput('label', 'Ask');
    fixture.componentRef.setInput('shortcut', 'Ctrl J');
    await fixture.whenStable();
    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(fixture.componentInstance.element());
    fixture.componentRef.setInput('ariaExpanded', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-expanded')).toBe(
      'true',
    );
  });

  it('draws the glow on hover and focus with the wave tokens, turning only with motion', () => {
    const css = compileScss('lib/components/ask-button/ask-button.component.scss');
    for (const n of [1, 2, 3, 4]) {
      expect(css).toContain(`var(--wave-${n})`);
    }
    expect(css).toContain('opacity: var(--wave-opacity)');
    expect(css).toContain('600ms');
    expect(css).toContain('ui-wave-turn 9s linear infinite');
    expect(css).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*animation: none/);
  });
});
