import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingChatComponent } from './landing-chat.component';

describe('LandingChatComponent', () => {
  it('shows the Saved Messages chat with five links', async () => {
    const fixture = await createTranslated(LandingChatComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.textContent).toContain('Saved Messages');
    expect(root.querySelectorAll('.landing-chat__message')).toHaveLength(5);
    expect(root.textContent).toContain('youtube.com/watch?v=ng22-signal-forms');
    expect(root.querySelector('button')?.textContent?.trim()).toBe('Put them on the shelf');
  });

  it('moves the links onto the shelf and back', async () => {
    const fixture = await createTranslated(LandingChatComponent);
    const root = fixture.nativeElement as HTMLElement;

    root.querySelector('button')?.click();
    await fixture.whenStable();

    expect(root.querySelectorAll('.landing-chat__message')).toHaveLength(0);
    expect(root.querySelectorAll('.landing-chat__folder')).toHaveLength(4);
    expect(root.querySelectorAll('.landing-chat__card')).toHaveLength(5);
    expect(root.textContent).toContain('Your shelf');
    expect(root.querySelector('button')?.textContent?.trim()).toBe('Show the chat again');

    root.querySelector('button')?.click();
    await fixture.whenStable();

    expect(root.querySelectorAll('.landing-chat__message')).toHaveLength(5);
  });

  it('has no axe violations in either state', async () => {
    const fixture = await createTranslated(LandingChatComponent);
    const root = fixture.nativeElement as HTMLElement;

    expect(await axeViolations(root)).toEqual([]);

    root.querySelector('button')?.click();
    await fixture.whenStable();

    expect(await axeViolations(root)).toEqual([]);
  });
});
