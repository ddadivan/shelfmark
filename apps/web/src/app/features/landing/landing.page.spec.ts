import { firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { AppTranslocoLoader } from '../../core/i18n/app-transloco.loader';
import { translocoConfig } from '../../core/i18n/transloco.config';
import LandingPage from './landing.page';

describe('LandingPage', () => {
  it('renders the translated title and tagline', async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader })],
    }).compileComponents();

    await firstValueFrom(TestBed.inject(TranslocoService).load('en'));
    const fixture = TestBed.createComponent(LandingPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toBe('Shelfmark');
    expect(element.querySelector('p')?.textContent).toBe('Every saved link, in one place.');
  });
});
