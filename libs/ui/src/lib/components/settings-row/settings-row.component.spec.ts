import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { compileScss } from '../../../testing/scss';
import { SwitchComponent } from '../switch/switch.component';
import { SETTINGS_ROW_ALIGN } from './models/settings-row-align.const';
import type { SettingsRowAlign } from './models/settings-row-align.type';
import { SettingsRowComponent } from './settings-row.component';
import { SettingsSectionComponent } from './settings-section/settings-section.component';

@Component({
  imports: [SettingsSectionComponent, SettingsRowComponent, SwitchComponent],
  template: `
    <ui-settings-section title="Saving" [danger]="danger()">
      <ui-settings-row
        title="Warn about duplicates"
        description="Shows where you already saved the same link"
        [align]="align()"
      >
        <ui-switch label="Warn about duplicates" />
      </ui-settings-row>
      <ui-settings-row title="Safari on iPhone" icon="user">
        <button type="button">Sign out</button>
      </ui-settings-row>
    </ui-settings-section>
  `,
})
class HostComponent {
  readonly align = signal<SettingsRowAlign>(SETTINGS_ROW_ALIGN.Center);
  readonly danger = signal(false);
}

function render() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return { fixture, root: fixture.nativeElement as HTMLElement };
}

describe('SettingsSectionComponent and SettingsRowComponent', () => {
  it('renders the group title as an h2 and names the group by it', () => {
    const { root } = render();
    const section = root.querySelector('ui-settings-section');
    const heading = section?.querySelector('h2');
    expect(heading?.textContent).toBe('Saving');
    expect(section?.getAttribute('role')).toBe('group');
    expect(section?.getAttribute('aria-labelledby')).toBe(heading?.id);
    expect(section?.querySelector('ui-panel')).not.toBeNull();
  });

  it('shows title, optional description and the projected control', () => {
    const { root } = render();
    const rows = root.querySelectorAll('ui-settings-row');
    expect(rows[0].querySelector('.ui-settings-row__title')?.textContent).toBe(
      'Warn about duplicates',
    );
    expect(rows[0].querySelector('.ui-settings-row__desc')?.textContent).toContain('same link');
    expect(rows[0].querySelector('.ui-settings-row__control ui-switch')).not.toBeNull();
    expect(rows[1].querySelector('.ui-settings-row__desc')).toBeNull();
    expect(rows[1].querySelector('.ui-settings-row__control button')?.textContent).toBe('Sign out');
  });

  it('draws the icon tile only when an icon is set', () => {
    const rows = render().root.querySelectorAll('ui-settings-row');
    expect(rows[0].querySelector('.ui-settings-row__icon')).toBeNull();
    expect(rows[1].querySelector('.ui-settings-row__icon ui-icon')).not.toBeNull();
  });

  it('gives every row a unique title id', () => {
    const rows = render().root.querySelectorAll('.ui-settings-row__title');
    expect(rows[0].id).not.toBe('');
    expect(rows[0].id).not.toBe(rows[1].id);
  });

  it('aligns to the first line only with align top', () => {
    const { fixture, root } = render();
    const row = root.querySelector('ui-settings-row');
    expect(row?.classList).not.toContain('ui-settings-row--top');
    fixture.componentInstance.align.set(SETTINGS_ROW_ALIGN.Top);
    fixture.detectChanges();
    expect(row?.classList).toContain('ui-settings-row--top');
  });

  it('separates rows with a border line, none on the first, and wraps the control', () => {
    const css = compileScss('lib/components/settings-row/settings-row.component.scss');
    expect(css).toContain('border-top: 1px solid var(--border)');
    expect(css).toMatch(/:host\(:first-of-type\)\s*{[^}]*border-top: 0/);
    expect(css).toContain('flex-wrap: wrap');
    expect(css).toContain('max-inline-size: 23.75rem');
    expect(css).toContain('inline-size: 2.25rem');
  });

  it('marks the destructive group with danger: class, red ring and red title', () => {
    const { fixture, root } = render();
    const section = root.querySelector('ui-settings-section');
    expect(section?.classList).not.toContain('ui-settings-section--danger');
    fixture.componentInstance.danger.set(true);
    fixture.detectChanges();
    expect(section?.classList).toContain('ui-settings-section--danger');
    const css = compileScss(
      'lib/components/settings-row/settings-section/settings-section.component.scss',
    );
    expect(css).toMatch(
      /ui-settings-section--danger[^{]*\.ui-settings-section__panel\s*\{[^}]*var\(--danger-bg\)/,
    );
    expect(css).toMatch(
      /ui-settings-section--danger[^{]*\.ui-settings-section__title\s*\{[^}]*color: var\(--danger\)/,
    );
  });

  it('has no axe violations', async () => {
    expect(await axeViolations(render().root)).toEqual([]);
  });
});
