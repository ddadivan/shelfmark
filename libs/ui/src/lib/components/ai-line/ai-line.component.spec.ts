import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { compileScss } from '../../../testing/scss';
import { AiLineComponent } from './ai-line.component';

@Component({
  imports: [AiLineComponent],
  template: `
    <ui-ai-line
      text="Suggestions aren't available right now. Your link saves as usual."
      [actionLabel]="actionLabel()"
      (action)="actions.set(actions() + 1)"
    />
  `,
})
class HostComponent {
  readonly actionLabel = signal('');
  readonly actions = signal(0);
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const update = (apply: (c: HostComponent) => void) => {
    apply(fixture.componentInstance);
    fixture.detectChanges();
  };
  return { fixture, host, update, cmp: fixture.componentInstance };
}

describe('ui-ai-line', () => {
  it('shows the spark mark and one sentence, no button by default', () => {
    const { host } = setup();
    expect(host.querySelector('.ui-ai-line__text')?.textContent).toContain(
      "Suggestions aren't available right now.",
    );
    expect(host.querySelector('.ui-ai-line__mark use')?.getAttribute('href')).toContain(
      '#sm-spark',
    );
    expect(host.querySelector('.ui-ai-line__mark')?.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('ui-button')).toBeNull();
  });

  it('adds a ghost button with actionLabel that emits action', () => {
    const { host, update, cmp } = setup();
    update((c) => c.actionLabel.set('Try again'));
    const button = host.querySelector<HTMLButtonElement>('ui-button button');

    expect(button?.textContent?.trim()).toBe('Try again');
    expect(button?.classList.contains('ui-button--ghost')).toBe(true);
    button?.click();
    expect(cmp.actions()).toBe(1);

    update((c) => c.actionLabel.set(''));
    expect(host.querySelector('ui-button')).toBeNull();
  });

  it('is quiet: text-muted caption, mark in ai, never a danger colour', () => {
    const css = compileScss('lib/components/ai-line/ai-line.component.scss');
    expect(css).toMatch(/:host\s*\{[^}]*color: var\(--text-muted\)/);
    expect(css).toMatch(/\.ui-ai-line__mark\s*\{[^}]*color: var\(--ai\)/);
    expect(css).not.toContain('--danger');
  });

  it('has no axe violations with and without the button', async () => {
    const { host, update } = setup();
    expect(await axeViolations(host)).toEqual([]);
    update((c) => c.actionLabel.set('AI settings'));
    expect(await axeViolations(host)).toEqual([]);
  });
});
