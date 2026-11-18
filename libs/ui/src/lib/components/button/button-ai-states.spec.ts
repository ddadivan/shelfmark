import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { ButtonComponent } from './button.component';

@Component({
  imports: [ButtonComponent],
  template: `
    <ui-button
      variant="ai"
      iconLeft="spark"
      [loading]="loading()"
      [ariaDisabled]="notYet()"
      (click)="clicks.set(clicks() + 1)"
      >{{ loading() ? 'Filling…' : 'Fill in with AI' }}</ui-button
    >
  `,
})
class HostComponent {
  readonly loading = signal(false);
  readonly notYet = signal(false);
  readonly clicks = signal(0);
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const control = () => root.querySelector('.ui-button') as HTMLButtonElement;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return { fixture, host: fixture.componentInstance, root, control, settle };
}

describe('ButtonComponent ai variant, busy (#507)', () => {
  it('keeps the spark and shows no spinner while loading; the sweep and pulse are CSS only', async () => {
    const { host, root, control, settle } = await setup();
    host.loading.set(true);
    await settle();

    expect(control().classList.contains('ui-button--ai-busy')).toBe(true);
    expect(control().getAttribute('aria-busy')).toBe('true');
    expect(root.querySelector('ui-spinner')).toBeNull();
    expect(control().querySelector('ui-icon')).not.toBeNull();
    expect(control().textContent).toContain('Filling…');
    expect(await axeViolations(root)).toEqual([]);

    host.loading.set(false);
    await settle();
    expect(control().classList.contains('ui-button--ai-busy')).toBe(false);
    expect(control().getAttribute('aria-busy')).toBeNull();
  });

  it('blocks a click while busy and stays focusable', async () => {
    const { host, control, settle } = await setup();
    host.loading.set(true);
    await settle();
    control().click();
    expect(host.clicks()).toBe(0);
    control().focus();
    expect(document.activeElement).toBe(control());
  });
});

describe('ButtonComponent ariaDisabled (#507)', () => {
  it('renders aria-disabled, stays focusable and enabled for the tooltip, and blocks a click', async () => {
    const { host, root, control, settle } = await setup();
    host.notYet.set(true);
    await settle();

    expect(control().getAttribute('aria-disabled')).toBe('true');
    expect(control().disabled).toBe(false);
    control().focus();
    expect(document.activeElement).toBe(control());
    control().click();
    expect(host.clicks()).toBe(0);
    expect(await axeViolations(root)).toEqual([]);

    host.notYet.set(false);
    await settle();
    expect(control().getAttribute('aria-disabled')).toBeNull();
    control().click();
    expect(host.clicks()).toBe(1);
  });
});

@Component({
  imports: [ButtonComponent],
  template: `<ui-button variant="ai-ghost" size="sm" iconLeft="spark" [loading]="loading()"
    >Rewrite</ui-button
  >`,
})
class GhostHostComponent {
  readonly loading = signal(false);
}

describe('ButtonComponent ai-ghost variant (#512)', () => {
  it('has its own class, a 20px spark and the same busy look as ai', async () => {
    const fixture = TestBed.createComponent(GhostHostComponent);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const control = () => root.querySelector('.ui-button') as HTMLButtonElement;
    expect(control().classList).toContain('ui-button--ai-ghost');
    expect(control().classList).not.toContain('ui-button--ai');
    expect(root.querySelector('ui-icon')?.classList).toContain('ui-icon--20');

    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(control().classList).toContain('ui-button--ai-busy');
    expect(root.querySelector('ui-spinner')).toBeNull();
    expect(await axeViolations(root)).toEqual([]);
  });
});
