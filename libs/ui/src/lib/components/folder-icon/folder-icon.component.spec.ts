import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { compileScss } from '../../../testing/scss';
import { FolderIconComponent } from './folder-icon.component';
import { FOLDER_COLOUR } from './models/folder-colour.const';
import { FOLDER_ICON_SIZE } from './models/folder-icon-size.const';

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(FolderIconComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('FolderIconComponent', () => {
  it('defaults to a graphite medium folder tile, decorative', () => {
    const host = render();
    expect(host.classList).toContain('ui-folder-icon--md');
    expect(host.classList).toContain('ui-folder-icon--graphite');
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.getAttribute('role')).toBeNull();
    expect(host.querySelector('use')?.getAttribute('href')).toContain('#sm-folder');
  });

  it('draws an own #rrggbb colour with readable shades set through CSSOM (#335)', () => {
    const host = render({ colour: '#3a7bd5' });
    expect(host.classList).toContain('ui-folder-icon--own');
    for (const name of ['tile-light', 'glyph-light', 'tile-dark', 'glyph-dark']) {
      expect(host.style.getPropertyValue(`--ui-folder-icon-${name}`)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('draws an emoji as decorative text instead of a sprite icon (#335)', () => {
    const host = render({ icon: '🍕' });
    expect(host.querySelector('use')).toBeNull();
    const emoji = host.querySelector('.ui-folder-icon__emoji');
    expect(emoji?.textContent).toBe('🍕');
    expect(emoji?.getAttribute('aria-hidden')).toBe('true');
    expect(host.getAttribute('aria-hidden')).toBe('true');
  });

  it.each(Object.values(FOLDER_COLOUR))('applies the %s colour class', (colour) => {
    expect(render({ colour }).classList).toContain(`ui-folder-icon--${colour}`);
  });

  it.each([
    [FOLDER_ICON_SIZE.Sm, 'ui-icon--16'],
    [FOLDER_ICON_SIZE.Md, 'ui-icon--16'],
    [FOLDER_ICON_SIZE.Lg, 'ui-icon--20'],
    [FOLDER_ICON_SIZE.Xl, 'ui-icon--24'],
  ])('size %s draws a %s glyph', (size, glyphClass) => {
    const host = render({ size });
    expect(host.classList).toContain(`ui-folder-icon--${size}`);
    expect(host.querySelector('ui-icon')?.classList).toContain(glyphClass);
  });

  it('draws the chosen icon', () => {
    expect(render({ icon: 'tag' }).querySelector('use')?.getAttribute('href')).toContain('#sm-tag');
  });

  it('becomes an image with a name when label is set', () => {
    const host = render({ label: 'Recipes' });
    expect(host.getAttribute('role')).toBe('img');
    expect(host.getAttribute('aria-label')).toBe('Recipes');
    expect(host.getAttribute('aria-hidden')).toBeNull();
  });

  it('takes tile and glyph colours from the folder tokens', () => {
    const css = compileScss('lib/components/folder-icon/folder-icon.component.scss');
    for (const colour of Object.values(FOLDER_COLOUR)) {
      expect(css).toContain(`--ui-folder-icon-glyph: var(--folder-${colour})`);
      expect(css).toContain(`--ui-folder-icon-tile: var(--folder-${colour}-bg)`);
    }
    expect(css).toContain('border-radius: var(--ui-folder-icon-radius)');
  });

  it('has no axe violations, decorative or labelled', async () => {
    expect(await axeViolations(render())).toEqual([]);
    expect(await axeViolations(render({ label: 'Recipes', colour: 'rose' }))).toEqual([]);
  });
});
