import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../testing/axe';
import type { SaveStatusState } from './models/save-status-state.type';
import { SaveStatusComponent } from './save-status.component';
import { SAVE_STATUS_STATE } from './models/save-status-state.const';

function setup(state: SaveStatusState) {
  const fixture = TestBed.createComponent(SaveStatusComponent);
  fixture.componentRef.setInput('state', state);
  fixture.componentRef.setInput('savingText', 'Saving…');
  fixture.componentRef.setInput('savedText', 'Saved');
  fixture.componentRef.setInput('errorText', 'Could not save');
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host,
    status: () => host.querySelector('.ui-save-status') as HTMLElement,
    text: () => host.querySelector('.ui-save-status__text')?.textContent,
  };
}

describe('SaveStatusComponent', () => {
  it('saving: spinner and the saving text', () => {
    const { host, status, text } = setup(SAVE_STATUS_STATE.Saving);
    expect(text()).toBe('Saving…');
    expect(host.querySelector('ui-spinner')).not.toBeNull();
    expect(host.querySelector('ui-icon')).toBeNull();
    expect(status().classList.contains('ui-save-status--done')).toBe(false);
    expect(status().classList.contains('ui-save-status--error')).toBe(false);
  });

  it('saved: check icon, sage modifier and the saved text', () => {
    const { host, status, text } = setup(SAVE_STATUS_STATE.Saved);
    expect(text()).toBe('Saved');
    expect(host.querySelector('ui-spinner')).toBeNull();
    expect(host.querySelector('use')?.getAttribute('href')).toContain('#sm-check');
    expect(status().classList.contains('ui-save-status--done')).toBe(true);
  });

  it('error: warning icon, danger modifier and the error text', () => {
    const { host, status, text } = setup(SAVE_STATUS_STATE.Error);
    expect(text()).toBe('Could not save');
    expect(host.querySelector('use')?.getAttribute('href')).toContain('#sm-error');
    expect(status().classList.contains('ui-save-status--error')).toBe(true);
  });

  it('follows the state', () => {
    const { fixture, host, text } = setup(SAVE_STATUS_STATE.Saving);
    fixture.componentRef.setInput('state', SAVE_STATUS_STATE.Saved);
    fixture.detectChanges();
    TestBed.tick();
    expect(text()).toBe('Saved');
    expect(host.querySelector('ui-icon')).not.toBeNull();
  });

  it('keeps the icon decorative and the text in a polite status region', () => {
    const { host, status } = setup(SAVE_STATUS_STATE.Saved);
    expect(status().getAttribute('role')).toBe('status');
    expect(host.querySelector('ui-icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it.each<SaveStatusState>(Object.values(SAVE_STATUS_STATE))(
    'has no axe violations (%s)',
    async (state) => {
      expect(await axeViolations(setup(state).host)).toEqual([]);
    },
  );
});
