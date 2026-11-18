import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { axeViolations } from '../../../../../testing/axe';
import { AiAppliedComponent } from './ai-applied.component';

async function setup(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(AiAppliedComponent);
  fixture.componentRef.setInput('label', 'Moved by AI');
  fixture.componentRef.setInput('undoLabel', 'Undo');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  const undo = await TestbedHarnessEnvironment.loader(fixture).getHarness(UiButtonHarness);
  return { fixture, undo, element: fixture.nativeElement as HTMLElement };
}

describe('AiAppliedComponent', () => {
  it('shows what AI applied and emits undo from the button', async () => {
    const { fixture, undo, element } = await setup();
    const emitted = vi.fn();
    fixture.componentInstance.undo.subscribe(emitted);
    expect(element.querySelector('ui-badge')?.textContent?.trim()).toBe('Moved by AI');
    expect(await undo.getText()).toBe('Undo');
    expect(await undo.getName()).toBe('Undo');
    await undo.click();
    expect(emitted).toHaveBeenCalledTimes(1);
  });

  it('names the button for screen readers and shows the spinner while busy', async () => {
    const { undo } = await setup({ undoAriaLabel: 'Undo: moved by AI', busy: true });
    expect(await undo.getName()).toBe('Undo: moved by AI');
    expect(await undo.isLoading()).toBe(true);
  });

  it('has no axe violations', async () => {
    const { element } = await setup();
    expect(await axeViolations(element)).toEqual([]);
  });
});
