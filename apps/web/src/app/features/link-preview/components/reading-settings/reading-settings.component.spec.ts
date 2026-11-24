import { TestBed } from '@angular/core/testing';
import { createPreviewReaderStub } from '../../../../../testing/preview-reader-stub';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { PreviewReaderService } from '../../services/preview-reader.service';
import { ReadingSettingsComponent } from './reading-settings.component';

async function setup() {
  const reader = createPreviewReaderStub();
  TestBed.configureTestingModule({
    providers: [provideTranslocoForTest(), { provide: PreviewReaderService, useValue: reader }],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(ReadingSettingsComponent);
  await fixture.whenStable();
  return { fixture, reader, component: fixture.componentInstance };
}

describe('ReadingSettingsComponent', () => {
  it('applies each choice at once', async () => {
    const { fixture, reader, component } = await setup();
    const trigger = document.createElement('button');
    document.body.append(trigger);
    component.popover().openFrom(trigger, { focus: false });
    await fixture.whenStable();
    const radios = () =>
      Array.from(document.querySelectorAll<HTMLInputElement>('.reading-settings input'));
    expect(radios().map((radio) => radio.value)).toEqual([
      's',
      'm',
      'l',
      'sans',
      'serif',
      'readable',
      'narrow',
      'wide',
      'app',
      'sepia',
    ]);
    for (const value of ['l', 'serif', 'wide', 'sepia']) {
      radios()
        .find((radio) => radio.value === value)
        ?.click();
    }
    expect(reader.setSettings).toHaveBeenCalledWith({ size: 'l' });
    expect(reader.setSettings).toHaveBeenCalledWith({ font: 'serif' });
    expect(reader.setSettings).toHaveBeenCalledWith({ width: 'wide' });
    expect(reader.setSettings).toHaveBeenCalledWith({ tone: 'sepia' });
    expect(document.body.textContent).toContain('Reading settings');
    component.popover().close();
    trigger.remove();
  });
});
