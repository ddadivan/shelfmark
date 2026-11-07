import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../testing/axe';
import { ButtonComponent } from './button.component';

@Component({
  imports: [ButtonComponent],
  template: `
    <ui-button size="lg" iconLeft="google">Continue with Google</ui-button>
    <ui-button size="lg" iconLeft="github">Continue with GitHub</ui-button>
  `,
})
class ProviderButtonsHost {}

describe('ui-button provider buttons', () => {
  async function setup() {
    const fixture = TestBed.createComponent(ProviderButtonsHost);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('names the action by the text and hides the decorative mark', async () => {
    const host = await setup();
    const buttons = [...host.querySelectorAll('button')];

    expect(buttons.map((b) => b.textContent?.trim())).toEqual([
      'Continue with Google',
      'Continue with GitHub',
    ]);
    for (const button of buttons) {
      expect(button.getAttribute('aria-label')).toBeNull();
      expect(button.querySelector('ui-icon')?.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('references the provider symbols in the sprite, 20px in the large button', async () => {
    const host = await setup();
    const uses = [...host.querySelectorAll('use')].map((u) => u.getAttribute('href'));

    expect(uses).toEqual([
      'assets/ui/icons/sprite.svg#sm-google',
      'assets/ui/icons/sprite.svg#sm-github',
    ]);
    expect(host.querySelector('ui-icon')?.classList.contains('ui-icon--20')).toBe(true);
  });

  it('has no axe violations', async () => {
    const host = await setup();
    document.body.append(host);

    expect(await axeViolations(host)).toEqual([]);
    host.remove();
  });
});
