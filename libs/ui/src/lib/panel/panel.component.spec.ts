import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { compileScss } from '../../testing/scss';
import { PanelComponent } from './panel.component';

@Component({
  imports: [PanelComponent],
  template: `<ui-panel
    ><h2>Settings</h2>
    <p>Body</p></ui-panel
  >`,
})
class HostComponent {}

describe('PanelComponent', () => {
  it('projects its content', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const panel = (fixture.nativeElement as HTMLElement).querySelector('ui-panel');
    expect(panel?.classList).toContain('ui-panel');
    expect(panel?.querySelector('h2')?.textContent).toBe('Settings');
    expect(panel?.querySelector('p')?.textContent).toBe('Body');
  });

  it('is a column surface with the card shadow and large radius, from tokens', () => {
    const css = compileScss('lib/panel/panel.component.scss');
    expect(css).toContain('flex-direction: column');
    expect(css).toContain('background: var(--surface)');
    expect(css).toContain('box-shadow: var(--shadow-card)');
    expect(css).toContain('border-radius: var(--radius-lg)');
    expect(css).toContain('padding: var(--space-6)');
    expect(css).toContain('gap: var(--space-4)');
  });

  it('has no axe violations', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(await axeViolations(fixture.nativeElement as HTMLElement)).toEqual([]);
  });
});
