import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { axeViolations } from '../../../../../testing/axe';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { HowItWorksService } from '../../services/how-it-works.service';
import { HowItWorksCardComponent } from './how-it-works-card.component';

async function setup() {
  const service = { open: vi.fn(), hideCard: vi.fn() };
  TestBed.configureTestingModule({
    providers: [provideTranslocoForTest(), { provide: HowItWorksService, useValue: service }],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(HowItWorksCardComponent);
  await fixture.whenStable();
  return {
    fixture,
    service,
    loader: TestbedHarnessEnvironment.loader(fixture),
    root: fixture.nativeElement as HTMLElement,
  };
}

describe('HowItWorksCardComponent', () => {
  it('is a named region that opens the video from its title', async () => {
    const { loader, root, service } = await setup();

    expect(root.querySelector('section')?.getAttribute('aria-label')).toBe('How it works');
    await (
      await loader.getHarness(UiButtonHarness.with({ text: 'New here? Watch how it works' }))
    ).click();

    expect(service.open).toHaveBeenCalledTimes(1);
  });

  it('hides the card from its close button', async () => {
    const { loader, service } = await setup();

    await (await loader.getHarness(UiButtonHarness.with({ name: 'Hide' }))).click();

    expect(service.hideCard).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations', async () => {
    const { root } = await setup();

    expect(await axeViolations(root)).toEqual([]);
  });
});
