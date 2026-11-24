import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { AiSettingsActions } from '../../services/ai-settings-actions.service';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AskPanelService } from '../../services/ask-panel.service';
import { AskHeaderButtonComponent } from './ask-header-button.component';

function setup(state: { isOn: boolean; askOn: boolean; turnsOn?: boolean }) {
  const isOn = signal(state.isOn);
  const askOn = signal(state.askOn);
  const panel = { open: vi.fn() };
  const actions = {
    setEnabled: vi.fn(async () => {
      if (state.turnsOn) {
        isOn.set(true);
        askOn.set(true);
      }
      return isOn();
    }),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AiSettingsStore, useValue: { isOn, askOn } },
      { provide: AiSettingsActions, useValue: actions },
      { provide: AskPanelService, useValue: panel },
    ],
  });
  return { panel, actions };
}

async function press(): Promise<HTMLElement> {
  const fixture = await createTranslated(AskHeaderButtonComponent);
  const root = fixture.nativeElement as HTMLElement;
  root.querySelector<HTMLButtonElement>('button')?.click();
  await fixture.whenStable();
  return root;
}

describe('AskHeaderButtonComponent', () => {
  it('is always shown, named "Ask your shelf", and opens Ask while Ask is on', async () => {
    const { panel, actions } = setup({ isOn: true, askOn: true });
    const root = await press();

    const button = root.querySelector('button');
    expect(button?.textContent?.trim()).toBe('Ask');
    expect(button?.getAttribute('aria-label')).toBe('Ask your shelf');
    expect(button?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(panel.open).toHaveBeenCalledTimes(1);
    expect(actions.setEnabled).not.toHaveBeenCalled();
    expect(await axeViolations(root)).toEqual([]);
  });

  it('turns AI on first while it is off, then opens Ask', async () => {
    const { panel, actions } = setup({ isOn: false, askOn: false, turnsOn: true });
    await press();

    expect(actions.setEnabled).toHaveBeenCalledWith(true);
    expect(panel.open).toHaveBeenCalledTimes(1);
  });

  it('opens nothing when the person leaves AI off in the intro', async () => {
    const { panel, actions } = setup({ isOn: false, askOn: false, turnsOn: false });
    await press();

    expect(actions.setEnabled).toHaveBeenCalledWith(true);
    expect(panel.open).not.toHaveBeenCalled();
  });

  it('opens Settings › AI while AI is on but Ask is switched off', async () => {
    const { panel } = setup({ isOn: true, askOn: false });
    const navigate = vi.spyOn(Router.prototype, 'navigate').mockResolvedValue(true);
    await press();

    expect(navigate).toHaveBeenCalledWith(['/', 'settings', 'ai']);
    expect(panel.open).not.toHaveBeenCalled();
  });
});
